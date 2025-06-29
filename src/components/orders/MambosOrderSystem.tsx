import React, { useState, useEffect } from 'react';

interface OrderItem {
  id: number;
  type: string;
  name: string;
  price: number;
  details?: string;
  sauces?: string[];
  extras?: string[];
}

interface Order {
  customer: string;
  phone: string;
  channel: 'delivery' | 'local' | 'takeaway';
  items: OrderItem[];
  total: number;
}

interface MambosOrderSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderComplete: (orderData: any) => void;
  editingOrder?: any; // ✅ NUEVO: Para modificar pedidos existentes
  mode?: 'create' | 'edit' | 'payment'; // ✅ NUEVO: Modo del modal
}

const MambosOrderSystem: React.FC<MambosOrderSystemProps> = ({
  isOpen,
  onClose,
  onOrderComplete,
  editingOrder = null,
  mode = 'create'
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [order, setOrder] = useState<Order>({
    customer: '',
    phone: '',
    channel: 'local',
    items: [],
    total: 0
  });

  // 🔥 RESET AL ABRIR MODAL
  useEffect(() => {
    if (isOpen) {
      setPaymentStep(1);
      setCurrentStep(1);
      setPaymentInfo({
        method: 'pending',
        cashAmount: 0,
        yapeAmount: 0,
        cardAmount: 0, // 🔥 Incluir para pago mixto
        tableNumber: '',
        deliveryAddress: ''
      });
      
    // 🔥 NUEVO: Si está editando, pre-poblar datos pero sin mostrar campos de cliente
      if (mode === 'edit' && editingOrder) {
        setOrder({
          customer: editingOrder.customerName || '',
          phone: editingOrder.customerPhone || '',
          channel: editingOrder.channel,
          items: [], // Empezar con items vacíos para agregar nuevos
          total: 0
        });
        setPaymentInfo(prev => ({
          ...prev,
          tableNumber: editingOrder.tableNumber || '',
          deliveryAddress: editingOrder.deliveryAddress || ''
        }));
      } else {
        // Reset para nuevo pedido
        setOrder({
          customer: '',
          phone: '',
          channel: 'local',
          items: [],
          total: 0
        });
      }
    }
  }, [isOpen, mode, editingOrder]);
  
  // ✅ NUEVO: Estado para manejo de pagos
  const [paymentStep, setPaymentStep] = useState(1);
  const [paymentInfo, setPaymentInfo] = useState({
    method: 'pending' as const,
    cashAmount: 0,
    yapeAmount: 0,
    cardAmount: 0, // 🔥 NUEVO para pago mixto
    tableNumber: '',
    deliveryAddress: ''
  });
  
  const [currentItem, setCurrentItem] = useState({
    type: '',
    subtype: '',
    quantity: 0,
    sauces: [] as string[],
    presentation: '',
    extras: [] as string[],
    name: '',
    price: 0
  });

  // Datos del menú de Mambo's
  const menuData = {
    alitas: {
      clasicas: {
        6: { price: 22, sauces: 1, name: '6 Alitas Clásicas' },
        8: { price: 26, sauces: 1, name: '8 Alitas Clásicas' },
        10: { price: 30, sauces: 2, name: '10 Alitas Clásicas' },
        20: { price: 54, sauces: 2, name: '20 Alitas Clásicas' },
        30: { price: 76, sauces: 3, name: '30 Alitas Clásicas' },
        40: { price: 98, sauces: 3, name: '40 Alitas Clásicas' }
      },
      broaster: {
        6: { price: 24, sauces: 1, name: '6 Alitas Broaster' },
        8: { price: 28, sauces: 1, name: '8 Alitas Broaster' },
        10: { price: 32, sauces: 2, name: '10 Alitas Broaster' },
        20: { price: 58, sauces: 2, name: '20 Alitas Broaster' },
        30: { price: 82, sauces: 3, name: '30 Alitas Broaster' },
        40: { price: 106, sauces: 3, name: '40 Alitas Broaster' }
      }
    },
    salsas: [
      'Acebichada', 'BBQ', 'Maracuyá', 'Búfalo', 'Honey Mustard', 
      'BBQ Picante', 'Coreana', 'Anticuchera', 'Chimichurri'
    ],
    salchipapas: [
      { name: 'Salchipapa Clásica', price: 10, id: 'salchi_clasica' },
      { name: 'Choripapa', price: 13, id: 'choripapa' },
      { name: 'Salchipapa Dorada', price: 15, id: 'salchi_dorada' },
      { name: 'Pollo Broaster 1/8', price: 15, id: 'pollo_broaster' }
    ],
    extras: [
      { name: 'Porción de Papa', price: 7, id: 'papa' },
      { name: 'Porción de Arroz', price: 4, id: 'arroz' },
      { name: 'Arroz Chaufa', price: 10, id: 'chaufa' },
      { name: 'Huevo Frito', price: 2, id: 'huevo' },
      { name: 'Tapers Descartable', price: 1, id: 'taper' },
      { name: 'Salsa Extra Acebichada', price: 2, id: 'salsa_acebichada' },
      { name: 'Salsa Extra BBQ', price: 2, id: 'salsa_bbq' },
      { name: 'Salsa Extra Maracuyá', price: 2, id: 'salsa_maracuya' },
      { name: 'Salsa Extra Búfalo', price: 2, id: 'salsa_bufalo' },
      { name: 'Salsa Extra Honey Mustard', price: 2, id: 'salsa_honey' },
      { name: 'Salsa Extra BBQ Picante', price: 2, id: 'salsa_bbq_picante' },
      { name: 'Salsa Extra Coreana', price: 2, id: 'salsa_coreana' },
      { name: 'Salsa Extra Anticuchera', price: 2, id: 'salsa_anticuchera' },
      { name: 'Salsa Extra Chimichurri', price: 2, id: 'salsa_chimichurri' }
    ],
    bebidas: [
      { name: 'Vaso de Chicha/Maracuyá', price: 6, id: 'vaso_chicha' },
      { name: 'Jarra de Chicha 1L', price: 17, id: 'jarra_chicha' },
      { name: 'Jarra de Maracuyá 1L', price: 15, id: 'jarra_maracuya' },
      { name: 'Inka Cola/Coca Cola 1L', price: 8, id: 'gaseosa_1l' },
      { name: 'Agua Mineral', price: 3, id: 'agua' },
      { name: 'Sporade', price: 4, id: 'sporade' },
      { name: 'Té', price: 3, id: 'te' },
      { name: 'Anís', price: 3, id: 'anis' },
      { name: 'Manzanilla', price: 3, id: 'manzanilla' },
      { name: 'Pilsen 305ml', price: 8, id: 'pilsen' },
      { name: 'Cusqueña 330ml', price: 10, id: 'cusquena' },
      { name: 'Corona 355ml', price: 10, id: 'corona' }
    ]
  };

  const resetCurrentItem = () => {
    setCurrentItem({
      type: '',
      subtype: '',
      quantity: 0,
      sauces: [],
      presentation: '',
      extras: [],
      name: '',
      price: 0
    });
  };

  // ✅ FUNCIÓN PARA AGREGAR ITEMS AL PEDIDO (ALITAS)
  const addItemToOrder = (forcedSauces?: string[], forcedPresentation?: string) => {
    let itemName = currentItem.name;
    let details = '';
    
    if (currentItem.type === 'alitas') {
      const finalSauces = forcedSauces !== undefined ? forcedSauces : currentItem.sauces;
      const finalPresentation = forcedPresentation || currentItem.presentation;
      
      let salsasInfo = '';
      
      if (finalPresentation === 'sin salsa') {
        salsasInfo = 'Sin salsa';
      } else if (finalSauces.length > 0) {
        salsasInfo = `Salsas: ${finalSauces.join(', ')}`;
      } else {
        salsasInfo = 'Sin salsa';
      }
      
      details = `${salsasInfo} - ${finalPresentation}`;
    }
    
    const newItem: OrderItem = {
      id: Date.now(),
      type: currentItem.type,
      name: itemName,
      price: currentItem.price,
      details,
      sauces: forcedSauces !== undefined ? forcedSauces : currentItem.sauces,
      extras: currentItem.extras
    };
    
    setOrder(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      total: prev.total + newItem.price
    }));
    
    resetCurrentItem();
    setCurrentStep(1);
  };

  // ✅ FUNCIÓN SIMPLIFICADA PARA ITEMS DIRECTOS (salchipapas, extras, bebidas)
  const addDirectItemToOrder = (itemData: { name: string; price: number; type: string }) => {
    const newItem: OrderItem = {
      id: Date.now(),
      type: itemData.type,
      name: itemData.name,
      price: itemData.price,
      details: '',
      sauces: [],
      extras: []
    };
    
    setOrder(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      total: prev.total + newItem.price
    }));
    
    resetCurrentItem();
    setCurrentStep(1);
  };

  const removeItemFromOrder = (itemId: number) => {
    const item = order.items.find(item => item.id === itemId);
    if (item) {
      setOrder(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId),
        total: prev.total - item.price
      }));
    }
  };

  const completeOrder = () => {
    if (order.items.length === 0) {
      alert('Debe agregar al menos un item al pedido');
      return;
    }
    
    // 🔥 MODO EDIT: Ir a paso de pago para preguntar cómo se pagó
    if (mode === 'edit') {
      console.log('DEBUG - Modo edit: preguntando forma de pago de items adicionales');
      
      // Si estamos en paso 7, procesar los items con pago
      if (currentStep === 7) {
        const orderData = {
          items: order.items.map(item => ({
            id: item.id.toString(),
            name: item.name,
            price: item.price,
            quantity: 1,
            category: item.type
          })),
          // 🔥 INCLUIR INFORMACIÓN DE PAGO DE LOS ITEMS ADICIONALES
          additionalPayment: {
            method: paymentInfo.method,
            cashAmount: paymentInfo.cashAmount,
            yapeAmount: paymentInfo.yapeAmount,
            cardAmount: paymentInfo.cardAmount,
            total: order.total
          }
        };
        
        console.log('DEBUG - Items y pago a agregar:', orderData);
        onOrderComplete(orderData);
        
        // Reset solo los items para seguir agregando si quiere
        setOrder(prev => ({
          ...prev,
          items: [],
          total: 0
        }));
        resetCurrentItem();
        setCurrentStep(1);
        setPaymentStep(1);
        setPaymentInfo({
          method: 'pending',
          cashAmount: 0,
          yapeAmount: 0,
          cardAmount: 0,
          tableNumber: '',
          deliveryAddress: ''
        });
        
        return;
      }
      
      // Si NO estamos en paso 7, ir al paso de pago
      console.log('DEBUG - Yendo a paso de pago para items adicionales');
      setPaymentStep(1);
      setCurrentStep(7);
      return;
    }
    
    // 🔥 MODO CREATE: Validaciones normales para pedidos nuevos
    if (order.channel === 'delivery') {
      if (!order.customer.trim()) {
        alert('Para delivery es obligatorio el nombre del cliente');
        return;
      }
      if (!order.phone.trim()) {
        alert('Para delivery es obligatorio el teléfono del cliente');
        return;
      }
    }
    
    if (order.channel === 'takeaway') {
      if (!order.customer.trim()) {
        alert('Para pedidos para llevar es obligatorio el nombre del cliente');
        return;
      }
    }
    
    // Para local, el nombre es opcional (puede ser "Mesa X")
    if (order.channel === 'local' && !order.customer.trim()) {
      const defaultName = paymentInfo.tableNumber ? `Mesa ${paymentInfo.tableNumber}` : 'Cliente Local';
      setOrder(prev => ({ ...prev, customer: defaultName }));
    }

    // 🔥 LÓGICA DE PAGOS (Solo para pedidos nuevos)
    if (currentStep !== 7) {
      console.log('DEBUG - Iniciando proceso de pago');
      setPaymentStep(1);
      setCurrentStep(7);
      return;
    }

    // 🔥 PROCESAR PEDIDO COMPLETO CON PAGO
    console.log('DEBUG - Procesando pedido final con pago');

    const orderData = {
      managerName: order.customer,
      customerPhone: order.phone,
      customerName: order.customer,
      channel: order.channel,
      paymentMethod: paymentInfo.method,
      paymentStatus: paymentInfo.method === 'pending' ? 'pending' : 'paid',
      cashReceived: paymentInfo.cashAmount,
      yapeAmount: paymentInfo.yapeAmount,
      cardAmount: paymentInfo.cardAmount,
      tableNumber: paymentInfo.tableNumber,
      deliveryAddress: paymentInfo.deliveryAddress,
      items: order.items.map(item => ({
        id: item.id.toString(),
        name: item.name,
        price: item.price,
        quantity: 1,
        category: item.type
      })),
      total: order.total,
      notes: order.items.map(item => 
        item.details ? `${item.name}: ${item.details}` : item.name
      ).join('; '),
      status: 'pending' as const,
      canModify: order.channel === 'local' && paymentInfo.method === 'pending'
    };

    try {
      console.log('DEBUG - Enviando pedido completo:', orderData);
      onOrderComplete(orderData);
      
      // Reset completo
      setOrder({
        customer: '',
        phone: '',
        channel: 'local',
        items: [],
        total: 0
      });
      resetCurrentItem();
      setCurrentStep(1);
      setPaymentStep(1);
      setPaymentInfo({
        method: 'pending',
        cashAmount: 0,
        yapeAmount: 0,
        cardAmount: 0,
        tableNumber: '',
        deliveryAddress: ''
      });
      
      console.log('DEBUG - Pedido creado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error al completar pedido:', error);
      alert('Error al crear el pedido. Intente nuevamente.');
    }
  };

  const goBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const StepIndicator = () => {
    const stepText = currentStep === 7 ? 'Pago' : `Paso ${currentStep} de 6`;
    return (
      <div className="flex items-center justify-center space-x-2 mb-4">
        <div className="text-sm font-medium text-gray-600">
          {stepText}
        </div>
      </div>
    );
  };

  // Paso 1: Tipo de producto
  const Step1_ItemType = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-center text-gray-800">¿Qué va a pedir?</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setCurrentItem(prev => ({ ...prev, type: 'alitas' }));
            setCurrentStep(2);
          }}
          className="p-4 bg-orange-500 text-white rounded-xl font-bold text-base hover:bg-orange-600 transition-colors shadow-lg"
        >
          ALITAS
        </button>
        <button
          onClick={() => {
            setCurrentItem(prev => ({ ...prev, type: 'salchipapas' }));
            setCurrentStep(3);
          }}
          className="p-4 bg-yellow-500 text-white rounded-xl font-bold text-base hover:bg-yellow-600 transition-colors shadow-lg"
        >
          SALCHIPAPAS
        </button>
        <button
          onClick={() => {
            setCurrentItem(prev => ({ ...prev, type: 'extras' }));
            setCurrentStep(3);
          }}
          className="p-4 bg-green-500 text-white rounded-xl font-bold text-base hover:bg-green-600 transition-colors shadow-lg"
        >
          EXTRAS
        </button>
        <button
          onClick={() => {
            setCurrentItem(prev => ({ ...prev, type: 'bebidas' }));
            setCurrentStep(3);
          }}
          className="p-4 bg-blue-500 text-white rounded-xl font-bold text-base hover:bg-blue-600 transition-colors shadow-lg"
        >
          BEBIDAS
        </button>
      </div>
    </div>
  );

  // Paso 2: Tipo de alitas
  const Step2_AlitasType = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-center text-gray-800">¿Qué tipo de alitas?</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setCurrentItem(prev => ({ ...prev, subtype: 'clasicas' }));
            setCurrentStep(3);
          }}
          className="p-4 bg-red-500 text-white rounded-xl font-bold text-base hover:bg-red-600 transition-colors shadow-lg"
        >
          CLÁSICAS
        </button>
        <button
          onClick={() => {
            setCurrentItem(prev => ({ ...prev, subtype: 'broaster' }));
            setCurrentStep(3);
          }}
          className="p-4 bg-yellow-600 text-white rounded-xl font-bold text-base hover:bg-yellow-700 transition-colors shadow-lg"
        >
          BROASTER
        </button>
      </div>
      <div className="flex justify-center pt-2">
        <button
          onClick={goBackStep}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          ← Volver
        </button>
      </div>
    </div>
  );

  // ✅ PASO 3 COMPLETAMENTE CORREGIDO - SOLUCIÓN PRINCIPAL
  const Step3_Selection = () => {
    if (currentItem.type === 'alitas') {
      const quantities = Object.keys(menuData.alitas[currentItem.subtype as 'clasicas' | 'broaster']);
      
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center text-gray-800">¿Cuántas piezas?</h3>
          <div className="grid grid-cols-3 gap-2">
            {quantities.map(qty => {
              const qtyNum = parseInt(qty);
              const data = menuData.alitas[currentItem.subtype as 'clasicas' | 'broaster'][qtyNum as keyof typeof menuData.alitas.clasicas];
              return (
                <button
                  key={qty}
                  onClick={() => {
                    setCurrentItem(prev => ({
                      ...prev,
                      quantity: qtyNum,
                      price: data.price,
                      name: data.name
                    }));
                    setCurrentStep(4);
                  }}
                  className="p-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg text-sm"
                >
                  {qty}<br />
                  <span className="text-xs">S/ {data.price}</span><br />
                  <span className="text-xs">{data.sauces} salsa{data.sauces > 1 ? 's' : ''}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-center pt-2">
            <button
              onClick={goBackStep}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Volver
            </button>
          </div>
        </div>
      );
    } 
    
    else if (currentItem.type === 'salchipapas') {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center text-gray-800">Selecciona tu salchipapa</h3>
          <div className="space-y-2">
            {menuData.salchipapas.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  console.log('Agregando salchipapa:', item.name);
                  addDirectItemToOrder({
                    name: item.name,
                    price: item.price,
                    type: 'salchipapas'
                  });
                }}
                className="w-full p-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition-colors shadow-lg flex justify-between items-center"
              >
                <span>{item.name}</span>
                <span>S/ {item.price}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-center pt-2">
            <button
              onClick={goBackStep}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Volver
            </button>
          </div>
        </div>
      );
    }
    
    else if (currentItem.type === 'extras') {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center text-gray-800">Extras</h3>
          <div className="space-y-2">
            {menuData.extras.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  console.log('Agregando extra:', item.name);
                  addDirectItemToOrder({
                    name: item.name,
                    price: item.price,
                    type: 'extras'
                  });
                }}
                className="w-full p-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg flex justify-between items-center"
              >
                <span>{item.name}</span>
                <span>S/ {item.price}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-center pt-2">
            <button
              onClick={goBackStep}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Volver
            </button>
          </div>
        </div>
      );
    }
    
    else if (currentItem.type === 'bebidas') {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center text-gray-800">Bebidas</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {menuData.bebidas.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  console.log('Agregando bebida:', item.name);
                  addDirectItemToOrder({
                    name: item.name,
                    price: item.price,
                    type: 'bebidas'
                  });
                }}
                className="w-full p-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg flex justify-between items-center"
              >
                <span className="text-sm">{item.name}</span>
                <span>S/ {item.price}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-center pt-2">
            <button
              onClick={goBackStep}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Volver
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // ✅ PASO 4 PARA ALITAS (SALSAS)
  const Step4_Salsas = () => {
    const maxSalsas = menuData.alitas[currentItem.subtype as 'clasicas' | 'broaster'][currentItem.quantity as keyof typeof menuData.alitas.clasicas]?.sauces || 0;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-center text-gray-800">
          Elige tus salsas ({currentItem.sauces.length}/{maxSalsas})
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          {menuData.salsas.map(salsa => (
            <button
              key={salsa}
              onClick={() => {
                setCurrentItem(prev => {
                  const isSelected = prev.sauces.includes(salsa);
                  let newSalsas;
                  
                  if (isSelected) {
                    newSalsas = prev.sauces.filter(s => s !== salsa);
                  } else if (prev.sauces.length < maxSalsas) {
                    newSalsas = [...prev.sauces, salsa];
                  } else {
                    newSalsas = [...prev.sauces.slice(0, -1), salsa];
                  }
                  
                  return { ...prev, sauces: newSalsas };
                });
              }}
              className={`p-2 rounded-lg font-medium transition-colors shadow text-sm ${
                currentItem.sauces.includes(salsa)
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {salsa}
            </button>
          ))}
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => {
              console.log('Sin Salsa clicked');
              addItemToOrder([], 'sin salsa');
            }}
            className="flex-1 p-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
          >
            Sin Salsa
          </button>
          <button
            onClick={() => {
              console.log('Bañada clicked, salsas:', currentItem.sauces);
              addItemToOrder(currentItem.sauces, 'bañada');
            }}
            className="flex-1 p-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            Bañada
          </button>
          <button
            onClick={() => {
              console.log('Aparte clicked, salsas:', currentItem.sauces);
              addItemToOrder(currentItem.sauces, 'aparte');
            }}
            className="flex-1 p-3 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition-colors"
          >
            Aparte
          </button>
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={goBackStep}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    // 🔥 CORREGIDO: Manejar paso de pago como número
    if (currentStep === 7) {
      return <PaymentSteps />;
    }
    
    switch (currentStep) {
      case 1: return <Step1_ItemType />;
      case 2: return <Step2_AlitasType />;
      case 3: return <Step3_Selection />;
      case 4: return <Step4_Salsas />;
      default: return <Step1_ItemType />;
    }
  };

  // ✅ NUEVOS COMPONENTES DE PAGO
  const PaymentSteps = () => {
    console.log('DEBUG - PaymentSteps, paymentStep:', paymentStep);
    if (paymentStep === 1) {
      return <PaymentMethod_Selection />;
    } else if (paymentStep === 2) {
      return <PaymentDetails />;
    } else if (paymentStep === 3) {
      return <PaymentConfirmation />;
    }
    return <PaymentMethod_Selection />;
  };

  const PaymentMethod_Selection = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-center text-gray-800">Como va a pagar?
      </h3>
      
      {/* Mostrar informacion del canal */}
      <div className="bg-blue-50 p-3 rounded-lg text-center">
        <p className="text-sm text-blue-700">
          {order.channel === 'local' && 'Mesa/Local'}
          {order.channel === 'delivery' && 'Delivery'}
          {order.channel === 'takeaway' && 'Para Llevar'}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          {order.channel === 'local' && 'Puede pagar ahora o al final'}
          {order.channel === 'delivery' && 'Pago requerido para procesar'}
          {order.channel === 'takeaway' && 'Pago requerido para preparar'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            console.log('DEBUG - Seleccionando EFECTIVO');
            setPaymentInfo(prev => ({ ...prev, method: 'cash' }));
            setPaymentStep(2);
          }}
          className="p-4 bg-green-500 text-white rounded-xl font-bold text-base hover:bg-green-600 transition-colors shadow-lg"
        >
          EFECTIVO
        </button>
        <button
          onClick={() => {
            console.log('DEBUG - Seleccionando YAPE');
            setPaymentInfo(prev => ({ ...prev, method: 'yape' }));
            setPaymentStep(2);
          }}
          className="p-4 bg-purple-500 text-white rounded-xl font-bold text-base hover:bg-purple-600 transition-colors shadow-lg"
        >
          YAPE
        </button>
        <button
          onClick={() => {
            console.log('DEBUG - Seleccionando PAGO MIXTO');
            setPaymentInfo(prev => ({ ...prev, method: 'mixed' }));
            setPaymentStep(2);
          }}
          className="p-4 bg-orange-600 text-white rounded-xl font-bold text-base hover:bg-orange-700 transition-colors shadow-lg"
        >
          PAGO MIXTO
        </button>
        
        {/* 🔥 TARJETA - Siempre disponible para casos excepcionales */}
        <button
          onClick={() => {
            console.log('DEBUG - Seleccionando TARJETA');
            setPaymentInfo(prev => ({ ...prev, method: 'card' }));
            setPaymentStep(2);
          }}
          className={`p-4 text-white rounded-xl font-bold text-base transition-colors shadow-lg ${
            order.channel === 'delivery' 
              ? 'bg-blue-400 hover:bg-blue-500 text-xs' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {order.channel === 'delivery' ? 'TARJETA\n(Excepcional)' : 'TARJETA'}
        </button>
        
        {/* 🔥 PAGAR DESPUÉS - Solo para pedidos locales */}
        {order.channel === 'local' && (
          <button
            onClick={() => {
              console.log('DEBUG - Seleccionando pagar despues');
              setPaymentInfo(prev => ({ ...prev, method: 'pending' }));
              setPaymentStep(3);
            }}
            className="p-4 bg-gray-500 text-white rounded-xl font-bold text-base hover:bg-gray-600 transition-colors shadow-lg col-span-2"
          >
            PAGAR DESPUES
          </button>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Volver al Menu
        </button>
      </div>
    </div>
  );

  const PaymentDetails = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-center text-gray-800">
        Detalles de Pago - {paymentInfo.method.toUpperCase()}
      </h3>
      
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-center">
          <p className="font-bold text-lg">Total: S/ {order.total}</p>
        </div>
      </div>

      {paymentInfo.method === 'cash' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Efectivo recibido:
          </label>
          <input
            type="number"
            value={paymentInfo.cashAmount || ''}
            onChange={(e) => setPaymentInfo(prev => ({ 
              ...prev, 
              cashAmount: parseFloat(e.target.value) || 0 
            }))}
            className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center"
            placeholder="S/ 0.00"
            min="0"
            step="0.50"
          />
          {paymentInfo.cashAmount > 0 && paymentInfo.cashAmount >= order.total && (
            <div className="bg-green-50 p-2 rounded text-center">
              <p className="text-green-700 font-medium">
                Vuelto: S/ {(paymentInfo.cashAmount - order.total).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {paymentInfo.method === 'yape' && (
        <div className="space-y-3">
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-4xl mb-2">QR</div>
            <p className="text-purple-700 font-medium">
              Mostrar QR de Yape al cliente
            </p>
            <p className="text-sm text-purple-600 mt-2">
              Monto: S/ {order.total}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="yape-confirmed"
              onChange={(e) => {
                if (e.target.checked) {
                  setPaymentInfo(prev => ({ ...prev, yapeAmount: order.total }));
                } else {
                  setPaymentInfo(prev => ({ ...prev, yapeAmount: 0 }));
                }
              }}
              className="w-4 h-4"
            />
            <label htmlFor="yape-confirmed" className="text-sm">
              Pago confirmado por Yape
            </label>
          </div>
        </div>
      )}

      {paymentInfo.method === 'card' && (
        <div className="space-y-3">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-4xl mb-2">TARJETA</div>
            <p className="text-blue-700 font-medium">
              Procesar pago con tarjeta
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Monto: S/ {order.total}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="card-confirmed"
              onChange={(e) => {
                if (e.target.checked) {
                  setPaymentInfo(prev => ({ ...prev, cardAmount: order.total }));
                } else {
                  setPaymentInfo(prev => ({ ...prev, cardAmount: 0 }));
                }
              }}
              className="w-4 h-4"
            />
            <label htmlFor="card-confirmed" className="text-sm">
              Pago procesado exitosamente
            </label>
          </div>
        </div>
      )}

      {/* 🔥 NUEVA SECCIÓN: PAGO MIXTO */}
      {paymentInfo.method === 'mixed' && (
        <div className="space-y-4">
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <div className="text-2xl mb-1">🔄</div>
            <p className="text-orange-700 font-medium">Pago Mixto</p>
            <p className="text-sm text-orange-600">Combina efectivo + Yape/Tarjeta</p>
          </div>
          
          {/* Efectivo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              💵 Monto en Efectivo:
            </label>
            <input
              type="number"
              value={paymentInfo.cashAmount || ''}
              onChange={(e) => setPaymentInfo(prev => ({ 
                ...prev, 
                cashAmount: parseFloat(e.target.value) || 0 
              }))}
              className="w-full p-2 border border-gray-300 rounded-lg text-center"
              placeholder="S/ 0.00"
              min="0"
              step="0.50"
            />
          </div>

          {/* Yape */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              📱 Monto por Yape:
            </label>
            <input
              type="number"
              value={paymentInfo.yapeAmount || ''}
              onChange={(e) => setPaymentInfo(prev => ({ 
                ...prev, 
                yapeAmount: parseFloat(e.target.value) || 0 
              }))}
              className="w-full p-2 border border-gray-300 rounded-lg text-center"
              placeholder="S/ 0.00"
              min="0"
              step="0.50"
            />
          </div>

          {/* Tarjeta */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              💳 Monto con Tarjeta:
            </label>
            <input
              type="number"
              value={paymentInfo.cardAmount || ''}
              onChange={(e) => setPaymentInfo(prev => ({ 
                ...prev, 
                cardAmount: parseFloat(e.target.value) || 0 
              }))}
              className="w-full p-2 border border-gray-300 rounded-lg text-center"
              placeholder="S/ 0.00"
              min="0"
              step="0.50"
            />
          </div>

          {/* Resumen del pago mixto */}
          <div className="bg-orange-50 p-3 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">Resumen:</h4>
            <div className="text-sm text-orange-700 space-y-1">
              <p>💵 Efectivo: S/ {paymentInfo.cashAmount.toFixed(2)}</p>
              <p>📱 Yape: S/ {paymentInfo.yapeAmount.toFixed(2)}</p>
              <p>💳 Tarjeta: S/ {paymentInfo.cardAmount.toFixed(2)}</p>
              <hr className="my-1" />
              <p className="font-medium">
                Total Pagado: S/ {(paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount).toFixed(2)}
              </p>
              <p className={`text-xs ${
                (paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount) >= order.total
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                Falta: S/ {Math.max(0, order.total - (paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount)).toFixed(2)}
              </p>
              {paymentInfo.cashAmount > 0 && (paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount) > order.total && (
                <p className="text-green-600 text-xs font-medium">
                  Vuelto: S/ {((paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount) - order.total).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {paymentInfo.method === 'pending' && (
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-4xl mb-2">PENDIENTE</div>
          <p className="text-yellow-700 font-medium">
            El cliente pagara despues
          </p>
          <p className="text-sm text-yellow-600 mt-2">
            Se puede modificar el pedido hasta que pague
          </p>
        </div>
      )}

      {/* Informacion adicional segun el canal */}
      {order.channel === 'local' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Numero de mesa (opcional):
          </label>
          <input
            type="text"
            value={paymentInfo.tableNumber}
            onChange={(e) => setPaymentInfo(prev => ({ 
              ...prev, 
              tableNumber: e.target.value 
            }))}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Ej: Mesa 5"
          />
        </div>
      )}

      {order.channel === 'delivery' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Direccion de entrega *:
          </label>
          <textarea
            value={paymentInfo.deliveryAddress}
            onChange={(e) => setPaymentInfo(prev => ({ 
              ...prev, 
              deliveryAddress: e.target.value 
            }))}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Ingrese la direccion completa..."
            rows={3}
            required
          />
        </div>
      )}

      <div className="flex space-x-2 pt-4">
        <button
          onClick={() => setPaymentStep(1)}
          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Volver
        </button>
        <button
          onClick={() => {
            console.log('DEBUG - Validando pago, metodo:', paymentInfo.method);
            
            // Validaciones
            if (order.channel === 'delivery' && !paymentInfo.deliveryAddress.trim()) {
              // 🔥 DIRECCIÓN OPCIONAL PARA DELIVERY - Solo aviso
              const confirmWithoutAddress = confirm(
                'No ha ingresado dirección. ¿Desea continuar sin dirección? '
                + 'La encargada tendrá que preguntarle al cliente.'
              );
              if (!confirmWithoutAddress) {
                return;
              }
            }
            
            if (paymentInfo.method === 'cash') {
              if (paymentInfo.cashAmount < order.total) {
                alert('El monto en efectivo debe ser mayor o igual al total');
                return;
              }
            }
            
            if (paymentInfo.method === 'yape' && paymentInfo.yapeAmount === 0) {
              alert('Debe confirmar el pago por Yape');
              return;
            }
            
            if (paymentInfo.method === 'card' && paymentInfo.cardAmount === 0) {
              alert('Debe confirmar el pago con tarjeta');
              return;
            }
            
            // 🔥 NUEVA VALIDACIÓN PARA PAGO MIXTO
            if (paymentInfo.method === 'mixed') {
              const totalPayment = paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount;
              if (totalPayment === 0) {
                alert('Debe ingresar al menos un método de pago');
                return;
              }
              if (totalPayment < order.total) {
                alert(`Falta S/ ${(order.total - totalPayment).toFixed(2)} por pagar`);
                return;
              }
            }
            
            console.log('DEBUG - Validacion pasada, yendo al paso 3');
            setPaymentStep(3);
          }}
          className="flex-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );

  const PaymentConfirmation = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-center text-gray-800">
        Confirmar Pedido
      </h3>
      
      {/* Resumen del pedido */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <h4 className="font-bold">Resumen:</h4>
        <div className="text-sm space-y-1">
          <p><strong>Cliente:</strong> {order.customer}</p>
          <p><strong>Canal:</strong> {order.channel === 'local' ? 'Mesa/Local' : order.channel === 'delivery' ? 'Delivery' : 'Para Llevar'}</p>
          {paymentInfo.tableNumber && <p><strong>Mesa:</strong> {paymentInfo.tableNumber}</p>}
          {paymentInfo.deliveryAddress && <p><strong>Direccion:</strong> {paymentInfo.deliveryAddress}</p>}
          <p><strong>Total:</strong> S/ {order.total}</p>
          
          {/* 🔥 MOSTRAR DETALLES SEGÚN EL MÉTODO DE PAGO */}
          {paymentInfo.method === 'pending' && (
            <p><strong>Pago:</strong> <span className="text-yellow-600">Pendiente</span></p>
          )}
          
          {paymentInfo.method === 'cash' && (
            <>
              <p><strong>Pago:</strong> <span className="text-green-600">Efectivo</span></p>
              {paymentInfo.cashAmount > order.total && (
                <p><strong>Vuelto:</strong> <span className="text-green-600">S/ {(paymentInfo.cashAmount - order.total).toFixed(2)}</span></p>
              )}
            </>
          )}
          
          {paymentInfo.method === 'yape' && (
            <p><strong>Pago:</strong> <span className="text-purple-600">Yape (S/ {order.total})</span></p>
          )}
          
          {paymentInfo.method === 'card' && (
            <p><strong>Pago:</strong> <span className="text-blue-600">Tarjeta (S/ {order.total})</span></p>
          )}
          
          {/* 🔥 NUEVO: RESUMEN DETALLADO PARA PAGO MIXTO */}
          {paymentInfo.method === 'mixed' && (
            <>
              <p><strong>Pago:</strong> <span className="text-orange-600">Mixto</span></p>
              <div className="ml-4 space-y-1 text-xs">
                {paymentInfo.cashAmount > 0 && (
                  <p>• Efectivo: S/ {paymentInfo.cashAmount.toFixed(2)}</p>
                )}
                {paymentInfo.yapeAmount > 0 && (
                  <p>• Yape: S/ {paymentInfo.yapeAmount.toFixed(2)}</p>
                )}
                {paymentInfo.cardAmount > 0 && (
                  <p>• Tarjeta: S/ {paymentInfo.cardAmount.toFixed(2)}</p>
                )}
                <p className="font-medium text-orange-700">
                  Total: S/ {(paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount).toFixed(2)}
                </p>
                {(paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount) > order.total && (
                  <p className="text-green-600 font-medium">
                    Vuelto: S/ {((paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount) - order.total).toFixed(2)}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => {
            console.log('DEBUG - Volviendo al paso 2');
            setPaymentStep(2);
          }}
          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Volver
        </button>
        <button
          onClick={() => {
            console.log('DEBUG - Creando pedido final');
            console.log('DEBUG - PaymentInfo:', paymentInfo);
            completeOrder();
          }}
          className="flex-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-bold"
        >
          Crear Pedido
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-orange-500 text-white p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold">
            {mode === 'edit' && editingOrder ? 
              `✏️ Agregar Items al Pedido #${editingOrder.id?.slice(-6) || 'EDIT'}` : 
              'Nuevo Pedido'
            }
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            X
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <StepIndicator />
          {renderCurrentStep()}
        </div>

        {/* Order Summary */}
        {order.items.length > 0 && (
          <div className="border-t bg-gray-50 p-4 flex-shrink-0">
            <h4 className="font-bold mb-2">Resumen del Pedido:</h4>
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{item.name}</span>
                    {item.details && <p className="text-gray-600 text-xs">{item.details}</p>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">S/ {item.price}</span>
                    <button
                      onClick={() => removeItemFromOrder(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 mt-2 font-bold">
              Total: S/ {order.total}
            </div>
          </div>
        )}

        {/* Footer - Solo cuando hay items y NO estamos en pago */}
        {order.items.length > 0 && currentStep !== 7 && (
          <div className="border-t p-4 space-y-3 flex-shrink-0">
            {/* Customer Info - Solo mostrar si NO estamos en modo edit */}
            {mode !== 'edit' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setOrder(prev => ({ ...prev, channel: 'local' }))}
                    className={`p-2 rounded-lg font-medium text-sm ${
                      order.channel === 'local' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    Local
                  </button>
                  <button
                    onClick={() => setOrder(prev => ({ ...prev, channel: 'delivery' }))}
                    className={`p-2 rounded-lg font-medium text-sm ${
                      order.channel === 'delivery' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    Delivery
                  </button>
                  <button
                    onClick={() => setOrder(prev => ({ ...prev, channel: 'takeaway' }))}
                    className={`p-2 rounded-lg font-medium text-sm ${
                      order.channel === 'takeaway' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    Llevar
                  </button>
                </div>
                
                {/* 🔥 CAMPOS DINÁMICOS SEGÚN CANAL */}
                <input
                  type="text"
                  placeholder={`Nombre del cliente${order.channel === 'delivery' || order.channel === 'takeaway' ? ' *' : ''}`}
                  value={order.customer}
                  onChange={(e) => setOrder(prev => ({ ...prev, customer: e.target.value }))}
                  className={`w-full p-2 border rounded-lg text-sm ${
                    (order.channel === 'delivery' || order.channel === 'takeaway') && !order.customer.trim()
                      ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required={order.channel === 'delivery' || order.channel === 'takeaway'}
                />
                
                <input
                  type="text"
                  placeholder={`Teléfono${order.channel === 'delivery' ? ' *' : ' (opcional)'}`}
                  value={order.phone}
                  onChange={(e) => setOrder(prev => ({ ...prev, phone: e.target.value }))}
                  className={`w-full p-2 border rounded-lg text-sm ${
                    order.channel === 'delivery' && !order.phone.trim()
                      ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required={order.channel === 'delivery'}
                />
                
                {/* 🔥 DIRECCIÓN SOLO PARA DELIVERY (OPCIONAL) */}
                {order.channel === 'delivery' && (
                  <textarea
                    placeholder="Dirección (opcional - para ahorrar tiempo)"
                    value={paymentInfo.deliveryAddress}
                    onChange={(e) => setPaymentInfo(prev => ({ 
                      ...prev, 
                      deliveryAddress: e.target.value 
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    rows={2}
                  />
                )}
              </>
            )}
            
            {/* Botón para finalizar/agregar */}
            <button
              onClick={() => {
                // 🔥 Para modo edit, ir directo a pagos para preguntar cómo se pagó
                if (mode === 'edit') {
                  setPaymentStep(1);
                  setCurrentStep(7);
                } else {
                  completeOrder();
                }
              }}
              className="w-full p-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors text-sm"
            >
              {mode === 'edit' ? '💳 ¿Cómo pagó los items?' : 'Finalizar Pedido'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MambosOrderSystem;