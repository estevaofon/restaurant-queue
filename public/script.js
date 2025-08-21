// Configuração da API (carregada de config.js)
const API_CONFIG = window.API_CONFIG || {
    baseURL: 'https://your-api-gateway-url.com/dev',
    endpoints: {
        queue: '/queue'
    },
    demoMode: true
};

// Estado da aplicação
let currentQueue = [];
let isLoading = false;

// Elementos do DOM
const elements = {
    // Formulário
    joinForm: document.getElementById('joinQueueForm'),
    customerName: document.getElementById('customerName'),
    phoneNumber: document.getElementById('phoneNumber'),
    partySize: document.getElementById('partySize'),
    
    // Status
    totalInQueue: document.getElementById('totalInQueue'),
    estimatedWait: document.getElementById('estimatedWait'),
    servedToday: document.getElementById('servedToday'),
    
    // Lista da fila
    queueContainer: document.getElementById('queueContainer'),
    statusFilter: document.getElementById('statusFilter'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    
    // Modal
    editModal: document.getElementById('editModal'),
    editForm: document.getElementById('editForm'),
    editCustomerId: document.getElementById('editCustomerId'),
    editCustomerName: document.getElementById('editCustomerName'),
    editPhoneNumber: document.getElementById('editPhoneNumber'),
    editPartySize: document.getElementById('editPartySize'),
    editStatus: document.getElementById('editStatus'),
    closeModal: document.getElementById('closeModal'),
    cancelEdit: document.getElementById('cancelEdit'),
    
    // Controles
    refreshBtn: document.getElementById('refreshBtn'),
    toastContainer: document.getElementById('toastContainer')
};

// Utilitários
class Utils {
    static formatTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '--:--';
        }
    }
    
    static formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return '--/--/----';
        }
    }
    
    static calculateWaitTime(checkInTime) {
        try {
            const now = new Date();
            const checkIn = new Date(checkInTime);
            const diffMs = now - checkIn;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            
            if (diffMins < 60) {
                return `${diffMins}min`;
            } else {
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                return `${hours}h ${mins}min`;
            }
        } catch {
            return '--';
        }
    }
    
    static estimateWaitTime(queuePosition, avgServiceTime = 20) {
        const totalMins = queuePosition * avgServiceTime;
        if (totalMins < 60) {
            return `${totalMins}min`;
        } else {
            const hours = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            return `${hours}h ${mins}min`;
        }
    }
    
    static generateId() {
        return 'customer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    static formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
        }
        return phone;
    }
}

// Gerenciamento de Toast Notifications
class ToastManager {
    static show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        elements.toastContainer.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
        
        // Click to remove
        toast.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }
    
    static success(message) {
        this.show(message, 'success');
    }
    
    static error(message) {
        this.show(message, 'error');
    }
    
    static warning(message) {
        this.show(message, 'warning');
    }
    
    static info(message) {
        this.show(message, 'info');
    }
}

// Gerenciamento da API
class ApiService {
    static async request(endpoint, options = {}) {
        const url = API_CONFIG.baseURL + endpoint;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const config = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    static async getQueue(status = '') {
        const params = status ? `?status=${encodeURIComponent(status)}` : '';
        return this.request(API_CONFIG.endpoints.queue + params);
    }
    
    static async addToQueue(customerData) {
        return this.request(API_CONFIG.endpoints.queue, {
            method: 'POST',
            body: JSON.stringify({
                id: Utils.generateId(),
                name: customerData.name,
                phone: customerData.phone || '',
                partySize: parseInt(customerData.partySize),
                status: 'waiting',
                checkInTime: new Date().toISOString(),
                ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 dias
            })
        });
    }
    
    static async updateCustomer(id, updates) {
        return this.request(`${API_CONFIG.endpoints.queue}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    
    static async removeFromQueue(id) {
        return this.request(`${API_CONFIG.endpoints.queue}/${id}`, {
            method: 'DELETE'
        });
    }
}

// Gerenciamento da UI
class UIManager {
    static setLoading(loading) {
        isLoading = loading;
        elements.loadingSpinner.style.display = loading ? 'flex' : 'none';
        
        // Disable form while loading
        const formElements = elements.joinForm.querySelectorAll('input, select, button');
        formElements.forEach(el => {
            el.disabled = loading;
        });
        
        if (loading) {
            elements.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando';
        } else {
            elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
        }
    }
    
    static updateStatus(queue) {
        const waitingCustomers = queue.filter(c => c.status === 'waiting').length;
        const servedToday = queue.filter(c => 
            c.status === 'seated' && 
            new Date(c.checkInTime).toDateString() === new Date().toDateString()
        ).length;
        
        elements.totalInQueue.textContent = waitingCustomers;
        elements.servedToday.textContent = servedToday;
        
        if (waitingCustomers > 0) {
            const avgWaitTime = Utils.estimateWaitTime(waitingCustomers);
            elements.estimatedWait.textContent = avgWaitTime;
        } else {
            elements.estimatedWait.textContent = '0min';
        }
    }
    
    static renderQueue(queue) {
        const filteredQueue = this.filterQueue(queue);
        
        if (filteredQueue.length === 0) {
            elements.queueContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Nenhum cliente na fila no momento</p>
                </div>
            `;
            return;
        }
        
        const queueHTML = filteredQueue.map((customer, index) => {
            const waitTime = Utils.calculateWaitTime(customer.checkInTime);
            const position = customer.status === 'waiting' ? index + 1 : '-';
            
            return `
                <div class="queue-item fade-in">
                    <div class="queue-item-info">
                        <div class="queue-item-name">${customer.name}</div>
                        <div class="queue-item-details">
                            <span><i class="fas fa-users"></i> ${customer.partySize} pessoa${customer.partySize > 1 ? 's' : ''}</span>
                            ${customer.phone ? `<span><i class="fas fa-phone"></i> ${Utils.formatPhone(customer.phone)}</span>` : ''}
                            <span><i class="fas fa-clock"></i> ${Utils.formatTime(customer.checkInTime)}</span>
                            <span><i class="fas fa-hourglass-half"></i> ${waitTime}</span>
                            ${customer.status === 'waiting' ? `<span><i class="fas fa-list-ol"></i> #${position}</span>` : ''}
                            <span class="status-badge status-${customer.status}">${this.getStatusText(customer.status)}</span>
                        </div>
                    </div>
                    <div class="queue-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="UIManager.editCustomer('${customer.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        ${this.getActionButtons(customer)}
                        <button class="btn btn-sm btn-error" onclick="UIManager.removeCustomer('${customer.id}')">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        elements.queueContainer.innerHTML = queueHTML;
    }
    
    static filterQueue(queue) {
        const status = elements.statusFilter.value;
        let filtered = status ? queue.filter(c => c.status === status) : queue;
        
        // Sort by status priority and check-in time
        const statusPriority = { waiting: 1, called: 2, seated: 3, cancelled: 4 };
        
        return filtered.sort((a, b) => {
            if (a.status !== b.status) {
                return statusPriority[a.status] - statusPriority[b.status];
            }
            return new Date(a.checkInTime) - new Date(b.checkInTime);
        });
    }
    
    static getStatusText(status) {
        const statusMap = {
            waiting: 'Aguardando',
            called: 'Chamado',
            seated: 'Sentado',
            cancelled: 'Cancelado'
        };
        return statusMap[status] || status;
    }
    
    static getActionButtons(customer) {
        switch (customer.status) {
            case 'waiting':
                return `
                    <button class="btn btn-sm btn-warning" onclick="UIManager.callCustomer('${customer.id}')">
                        <i class="fas fa-bell"></i> Chamar
                    </button>
                `;
            case 'called':
                return `
                    <button class="btn btn-sm btn-success" onclick="UIManager.seatCustomer('${customer.id}')">
                        <i class="fas fa-chair"></i> Sentar
                    </button>
                `;
            default:
                return '';
        }
    }
    
    static async callCustomer(id) {
        try {
            await ApiService.updateCustomer(id, { status: 'called' });
            ToastManager.success('Cliente chamado com sucesso!');
            await loadQueue();
        } catch (error) {
            ToastManager.error('Erro ao chamar cliente: ' + error.message);
        }
    }
    
    static async seatCustomer(id) {
        try {
            await ApiService.updateCustomer(id, { status: 'seated' });
            ToastManager.success('Cliente sentado com sucesso!');
            await loadQueue();
        } catch (error) {
            ToastManager.error('Erro ao sentar cliente: ' + error.message);
        }
    }
    
    static async removeCustomer(id) {
        if (!confirm('Tem certeza que deseja remover este cliente da fila?')) {
            return;
        }
        
        try {
            await ApiService.removeFromQueue(id);
            ToastManager.success('Cliente removido da fila!');
            await loadQueue();
        } catch (error) {
            ToastManager.error('Erro ao remover cliente: ' + error.message);
        }
    }
    
    static editCustomer(id) {
        const customer = currentQueue.find(c => c.id === id);
        if (!customer) {
            ToastManager.error('Cliente não encontrado!');
            return;
        }
        
        // Preencher modal
        elements.editCustomerId.value = customer.id;
        elements.editCustomerName.value = customer.name;
        elements.editPhoneNumber.value = customer.phone || '';
        elements.editPartySize.value = customer.partySize;
        elements.editStatus.value = customer.status;
        
        // Mostrar modal
        elements.editModal.classList.add('active');
    }
    
    static closeEditModal() {
        elements.editModal.classList.remove('active');
        elements.editForm.reset();
    }
}

// Funções principais
async function loadQueue() {
    try {
        UIManager.setLoading(true);
        const response = await ApiService.getQueue();
        currentQueue = response.items || response || [];
        
        UIManager.updateStatus(currentQueue);
        UIManager.renderQueue(currentQueue);
        
    } catch (error) {
        console.error('Erro ao carregar fila:', error);
        ToastManager.error('Erro ao carregar fila. Verifique sua conexão.');
        
        // Fallback para modo offline/demo
        if (error.message.includes('fetch') || API_CONFIG.demoMode) {
            loadDemoData();
        }
    } finally {
        UIManager.setLoading(false);
    }
}

function loadDemoData() {
    ToastManager.warning('Modo demonstração ativo. Configure a URL da API.');
    
    currentQueue = [
        {
            id: 'demo-1',
            name: 'João Silva',
            phone: '11999998888',
            partySize: 2,
            status: 'waiting',
            checkInTime: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-2',
            name: 'Maria Santos',
            phone: '11888887777',
            partySize: 4,
            status: 'called',
            checkInTime: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-3',
            name: 'Pedro Costa',
            phone: '',
            partySize: 1,
            status: 'seated',
            checkInTime: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        }
    ];
    
    UIManager.updateStatus(currentQueue);
    UIManager.renderQueue(currentQueue);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Carregar fila inicial
    loadQueue();
    
    // Auto-refresh a cada 30 segundos
    setInterval(loadQueue, 30000);
    
    // Formulário de entrada na fila
    elements.joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: elements.customerName.value.trim(),
            phone: elements.phoneNumber.value.trim(),
            partySize: elements.partySize.value
        };
        
        if (!formData.name || !formData.partySize) {
            ToastManager.error('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        
        try {
            await ApiService.addToQueue(formData);
            ToastManager.success(`${formData.name} foi adicionado à fila!`);
            elements.joinForm.reset();
            await loadQueue();
        } catch (error) {
            ToastManager.error('Erro ao adicionar à fila: ' + error.message);
        }
    });
    
    // Filtro de status
    elements.statusFilter.addEventListener('change', () => {
        UIManager.renderQueue(currentQueue);
    });
    
    // Botão refresh
    elements.refreshBtn.addEventListener('click', loadQueue);
    
    // Modal de edição
    elements.editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updates = {
            name: elements.editCustomerName.value.trim(),
            phone: elements.editPhoneNumber.value.trim(),
            partySize: parseInt(elements.editPartySize.value),
            status: elements.editStatus.value
        };
        
        try {
            await ApiService.updateCustomer(elements.editCustomerId.value, updates);
            ToastManager.success('Cliente atualizado com sucesso!');
            UIManager.closeEditModal();
            await loadQueue();
        } catch (error) {
            ToastManager.error('Erro ao atualizar cliente: ' + error.message);
        }
    });
    
    // Fechar modal
    elements.closeModal.addEventListener('click', UIManager.closeEditModal);
    elements.cancelEdit.addEventListener('click', UIManager.closeEditModal);
    
    // Fechar modal clicando fora
    elements.editModal.addEventListener('click', (e) => {
        if (e.target === elements.editModal) {
            UIManager.closeEditModal();
        }
    });
    
    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            UIManager.closeEditModal();
        }
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            loadQueue();
        }
    });
    
    // Formatação automática do telefone
    elements.phoneNumber.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            if (value.length > 6) {
                value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/(\d{0,2})/, '($1');
            }
        }
        e.target.value = value;
    });
    
    elements.editPhoneNumber.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            if (value.length > 6) {
                value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/(\d{0,2})/, '($1');
            }
        }
        e.target.value = value;
    });
});

// Tornar funções disponíveis globalmente para onclick handlers
window.UIManager = UIManager;
