// Utilidades de formateo
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount);
};

export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatOrderId = (id: string): string => {
  return `#${id.slice(-6).toUpperCase()}`;
};

export const formatPhoneNumber = (phone: string): string => {
  // Formatear número peruano: +51 999 999 999
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `+51 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
};
