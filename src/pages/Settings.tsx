import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useOrders } from '../context/OrderContext';
import { useMenu } from '../context/MenuContext';
import { ProtectedRoute, usePermission, PermissionGuard, RoleDisplay } from '../auth';

const Settings: React.FC = () => {
  const { state: appState, updateSettings } = useApp();
  const { state: orderState } = useOrders();
  const { state: menuState, addMenuItem, updateMenuItem, deleteMenuItem } = useMenu();
  
  const { settings } = appState;
  const { orders } = orderState;
  const { items: menu } = menuState;
  
  const [activeTab, setActiveTab] = useState('menu');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [localSettings, setLocalSettings] = useState({
    restaurantName: settings.restaurantName || 'Mambos',
    address: settings.address || '',
    phone: settings.phone || '',
    email: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: 'alitas',
    description: '',
    available: true
  });

  const categories = Array.from(new Set(menu.map(item => item.category)));
  
  const filteredMenu = menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount);
  };

  const handleSaveSettings = () => {
    updateSettings({
      restaurantName: localSettings.restaurantName,
      address: localSettings.address,
      phone: localSettings.phone
    });
    alert('Configuración guardada correctamente');
  };

  const handleShowModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        price: item.price,
        category: item.category,
        description: item.description || '',
        available: item.available
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        price: 0,
        category: 'alitas',
        description: '',
        available: true
      });
    }
    setShowMenuModal(true);
  };

  const handleSubmitMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || formData.price <= 0) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, formData);
        alert('Producto actualizado correctamente');
      } else {
        await addMenuItem(formData);
        alert('Producto agregado al menú');
      }
      
      setShowMenuModal(false);
      setEditingItem(null);
      setFormData({
        name: '',
        price: 0,
        category: 'alitas',
        description: '',
        available: true
      });
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar el producto');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        await deleteMenuItem(itemId);
        alert('Producto eliminado del menú');
      } catch (error) {
        console.error('Error al eliminar producto:', error);
        alert('Error al eliminar el producto');
      }
    }
  };

  const toggleAvailability = async (itemId: string, currentAvailability: boolean) => {
    try {
      await updateMenuItem(itemId, { available: !currentAvailability });
    } catch (error) {
      console.error('Error al actualizar disponibilidad:', error);
      alert('Error al actualizar la disponibilidad');
    }
  };

  // Calcular estadísticas
  const totalSales = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Gestiona la configuración del sistema</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'menu'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Menú
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            General
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Header del menú */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Gestión del Menú</h2>
              <p className="text-gray-600">Administra los productos disponibles</p>
            </div>
            <button 
              onClick={() => handleShowModal()}
              className="mt-4 sm:mt-0 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center"
            >
              <span className="mr-2">+</span>
              Agregar Producto
            </button>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Productos ({filteredMenu.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredMenu.map((item) => (
                <div key={item.id} className="p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{item.category}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleAvailability(item.id, item.available)}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          item.available 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {item.available ? 'Disponible' : 'No disponible'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(item.price)}</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleShowModal(item)}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredMenu.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <p>No se encontraron productos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuración General</h2>
            <p className="text-gray-600">Configuración básica del restaurante</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información del Restaurante */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Restaurante</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Restaurante
                  </label>
                  <input
                    type="text"
                    value={localSettings.restaurantName}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, restaurantName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={localSettings.address}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={localSettings.phone}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={localSettings.email}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Información del Sistema */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Sistema</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Versión:</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Última actualización:</span>
                  <span className="font-medium">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Activo
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Estadísticas de Uso</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pedidos registrados:</span>
                    <span className="font-medium">{orders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Productos en menú:</span>
                    <span className="font-medium">{menu.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ventas totales:</span>
                    <span className="font-medium">{formatCurrency(totalSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Último acceso:</span>
                    <span className="font-medium">Ahora</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón para guardar */}
          <div className="flex justify-end">
            <button 
              onClick={handleSaveSettings}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      )}

      {/* Modal para agregar/editar producto */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Editar Producto' : 'Agregar Producto'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmitMenuItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="alitas">Alitas</option>
                  <option value="salchipapas">Salchipapas</option>
                  <option value="extras">Extras</option>
                  <option value="bebidas">Bebidas</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Descripción del producto..."
                />
              </div>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-900">Producto disponible</span>
              </label>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMenuModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formData.name.trim() || formData.price <= 0}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingItem ? 'Actualizar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </ProtectedRoute>
  );
};

export default Settings;