import { useState } from 'react';

export default function KanbanBoard() {
  // Data dummy awal untuk pondasi tampilan sebelum fetch dari API
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Membuat Dokumentasi', status: 'To Do' },
    { id: 2, title: 'Riset UI/UX', status: 'In Progress' },
    { id: 3, title: 'Setup Database', status: 'Done' },
  ]);

  const columns = ['To Do', 'In Progress', 'Done'];

  const moveTask = (id, newStatus) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, status: newStatus } : task));
    // Catatan untuk MK Pengujian/QA: Di sini nanti ditambahkan fungsi axios.put ke API backend
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Papan Tugas Projek</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <div key={column} className="bg-gray-100 p-4 rounded-lg shadow-sm min-h-[300px]">
            <h3 className="font-semibold text-lg mb-4 text-gray-700 border-b pb-2">{column}</h3>
            <div className="space-y-3">
              {tasks
                .filter((task) => task.status === column)
                .map((task) => (
                  <div key={task.id} className="bg-white p-4 rounded shadow-sm border border-gray-200">
                    <p className="text-gray-800 font-medium">{task.title}</p>
                    <div className="mt-3 flex gap-2">
                      {column !== 'To Do' && (
                        <button 
                          onClick={() => moveTask(task.id, column === 'Done' ? 'In Progress' : 'To Do')}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded"
                        >
                          ◀ Mundur
                        </button>
                      )}
                      {column !== 'Done' && (
                        <button 
                          onClick={() => moveTask(task.id, column === 'To Do' ? 'In Progress' : 'Done')}
                          className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                        >
                          Maju ▶
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}