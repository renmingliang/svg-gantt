var tasks = [
    {
        // start: '2024-04-01 09:00:00',
        // end: '2024-04-01 23:50:50',
        name: 'Redesign website',
        id: 'Task 0',
        progress: 30,
    },
    {
        start: '2024-03-26',
        // Utilizes duration
        duration: '6d',
        name: 'Write new content',
        thumbnail:
            'https://www.baidu.com/img/PCtm_d9c8750bed0b3c7d089fa7d55720d6cf.png',
        id: 'Task 1',
        progress: 5,
        important: true,
    },
    {
        start: '2024-02-04',
        end: '2024-02-08',
        name: 'Apply new styles',
        id: 'Task 2',
        progress: 80,
        dependencies: 'Task 1',
    },
    {
        start: '2024-04-08',
        end: '2024-04-09',
        name: 'Review',
        id: 'Task 3',
        progress: 5,
        dependencies: 'Task 2',
    },
    {
        start: '2024-04-08',
        end: '',
        name: 'Deploy',
        id: 'Task 4',
        progress: 0,
        dependencies: 'Task 2',
    },
    {
        start: '2024-07-21',
        end: '2024-08-01',
        name: 'Go Live!',
        id: 'Task 5',
        progress: 0,
        dependencies: 'Task 1, Task 2',
        custom_class: 'bar-milestone',
    },
    {
        start: '2024-08-05',
        end: '2024-10-12',
        name: 'Long term task',
        id: 'Task 6',
        progress: 0,
    },
];

// Uncomment to test fixed header
tasks = [
  ...tasks,
  ...Array.from({ length: tasks.length * 300 }, (_, i) =>
    (Object.assign({}, tasks[i % 3], { id: `Task ${i}` })))
];
