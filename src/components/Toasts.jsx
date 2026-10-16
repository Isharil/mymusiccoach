import { useApp } from '../context/AppContext';

const Toasts = () => {
  const {
    setToasts, toasts
  } = useApp();

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] space-y-2 max-w-sm w-full px-4">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'warning' ? 'bg-amber-500 text-white' :
            'bg-gray-800 text-white'
          }`}
          onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default Toasts;
