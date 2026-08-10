// 资源基址：用相对路径("")。
// 同源 iframe 部署时，无论本地 localhost:8080 还是 GitHub Pages (huanghaiying20.github.io/jiexian-sim/)，
// 相邻文件 PNG / MP3 都能用相对路径找到，零外部依赖。
// (旧版硬编码 Gitee raw 已弃用，因为现在走 iframe 同源方案，不再需要跨域 CDN。)
var ASSET_BASE = '';
function resolveAsset(p) {
  if (!p) return p;
  if (/^(https?:|data:|\/\/)/.test(p)) return p; // 已是绝对地址或 data URL,原样返回
  return ASSET_BASE + p;
}
var IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

var DEFAULT_COMPONENTS = [
    { type: 'power-supply', name: '漏电保护开关', image: '空气开关.png', imgW: 120, imgH: 160, width: 140, height: 230,
      ports: [{ id: 'L', label: 'L (火线)', color: '#e74c3c' }, { id: 'N', label: 'N (零线)', color: '#3498db' }] },
    { type: 'transformer', name: '开关电源', image: '电源开关.png', imgW: 150, imgH: 110, width: 185, height: 215,
      ports: [{ id: 'L', label: 'L', color: '#e74c3c' }, { id: 'N', label: 'N', color: '#3498db' }, { id: 'COM', label: 'COM', color: '#7f8c8d' }, { id: 'V+', label: '24V', color: '#27ae60' }] },
    { type: 'relay', name: '继电器', image: '继电器.png', imgW: 130, imgH: 130, width: 180, height: 250, hasDualPorts: true,
      topPorts: [{ id: 'L', label: '8', color: '#e74c3c' }, { id: '', label: '', color: 'transparent', hidden: true }],
      ports: [{ id: 'LOAD', label: '12', color: '#000000' }, { id: 'V+', label: '14', color: '#e74c3c' }, { id: 'V-', label: '13', color: '#3498db' }] },
    { type: 'terminal-block', name: '接线端子排', image: '接线端子排.png', imgW: 150, imgH: 70, width: 170, height: 150, hasDualPorts: true,
      topPorts: [{ id: '2', label: '1', color: '#e74c3c' }, { id: '3', label: '2', color: '#3498db' }, { id: '4', label: '3', color: '#27ae60' }, { id: '5', label: '4', color: '#9b59b6' }, { id: '1', label: '5', color: '#f39c12' }, { id: '12', label: '6', color: '#000000' }],
      ports: [{ id: '6', label: '1', color: '#e74c3c' }, { id: '7', label: '2', color: '#3498db' }, { id: '8', label: '3', color: '#27ae60' }, { id: '9', label: '4', color: '#9b59b6' }, { id: '10', label: '5', color: '#f39c12' }, { id: '11', label: '6', color: '#000000' }] },
    { type: 'buzzer', name: '蜂鸣器', image: '蜂鸣器.png', imgW: 100, imgH: 100, width: 120, height: 170,
      ports: [{ id: 'V+', label: '+', color: '#e74c3c' }, { id: 'V-', label: '-', color: '#3498db' }] },
    { type: 'detector', name: '位移传感器', image: '位移传感器.png', imgW: 120, imgH: 100, width: 140, height: 180,
      ports: [{ id: 'V+', label: '24V', color: '#e74c3c' }, { id: 'V-', label: 'COM', color: '#3498db' }, { id: 'signal', label: '信号', color: '#2c3e50' }] },
    { type: 'sensor', name: '光电开关', image: '光电传感器.png', imgW: 130, imgH: 130, width: 130, height: 200, portsTop: true,
      ports: [{ id: 'L1', label: 'L', color: '#e74c3c' }, { id: 'L2', label: 'L', color: '#e74c3c' }] },
    { type: 'bulb', name: '灯泡', image: '灯泡.png', imgW: 100, imgH: 100, width: 120, height: 170,
      ports: [{ id: 'V+', label: '+', color: '#e74c3c' }, { id: 'V-', label: '-', color: '#3498db' }] }
];

var DEFAULT_TASKS = [
    { id: 'series', name: '串联电路', image: '串联电路.png' },
    { id: 'parallel', name: '并联电路', image: '并联电路.png' }
];

document.addEventListener('DOMContentLoaded', function() {
    // Clean up duplicates and empty-image custom components on load
    (function cleanupLocalStorage() {
        try {
            var localComponents = JSON.parse(localStorage.getItem('custom_components') || '[]');
            var seen = {};
            var cleaned = [];
            for (var i = 0; i < localComponents.length; i++) {
                var comp = localComponents[i];
                // Skip if no image or empty name
                if (!comp.image || !comp.name) continue;
                // Skip duplicates (keep first one)
                if (seen[comp.name]) continue;
                seen[comp.name] = true;
                cleaned.push(comp);
            }
            if (cleaned.length !== localComponents.length) {
                localStorage.setItem('custom_components', JSON.stringify(cleaned));
            }
        } catch(e) {}
    })();

    fetch(resolveAsset('config.json')).then(function(r) { return r.json(); }).then(function(config) {
        initApp(config.components, config.tasks);
    }).catch(function(err) {
        initApp(DEFAULT_COMPONENTS, DEFAULT_TASKS);
    });
});

function initApp(baseComponents, baseTasks) {
    var localComponents = JSON.parse(localStorage.getItem('custom_components') || '[]');
    var localTasks = JSON.parse(localStorage.getItem('custom_tasks') || '[]');
    var allComponents = baseComponents.concat(localComponents);
    var allTasks = baseTasks.concat(localTasks);

    buildComponentTypes(allComponents);
    renderSidebar(allComponents);
    renderTaskPanel(allTasks);
    initCircuitSimulator();
    bindSidebarEvents();
    bindModalEvents();
    updateSidebarLock();
}

function buildComponentTypes(components) {
    window.__componentConfigs = components;
}

function renderSidebar(components) {
    var container = document.getElementById('component-slots');
    container.innerHTML = '';
    var deletedTypes = JSON.parse(localStorage.getItem('deleted_components') || '[]');
    components.forEach(function(c) {
        if (deletedTypes.indexOf(c.type) !== -1) return;
        var slot = document.createElement('div');
        slot.className = 'component-slot';
        slot.setAttribute('role', 'button');
        slot.setAttribute('tabindex', '0');
        slot.dataset.componentType = c.type;
        var isCustom = c.type.indexOf('custom-') === 0;
        var delBtn = '<button class="slot-del-btn" data-del-type="' + c.type + '" data-is-custom="' + isCustom + '" title="删除"><i class="fas fa-times"></i></button>';
        slot.innerHTML = delBtn +
            '<img src="' + resolveAsset(c.image) + '" alt="' + c.name + '">' +
            '<div class="component-slot-name">' + c.name + '</div>';
        container.appendChild(slot);
    });
}

function renderTaskPanel(tasks) {
    var container = document.getElementById('task-slots');
    container.innerHTML = '';
    var deletedTasks = JSON.parse(localStorage.getItem('deleted_tasks') || '[]');
    tasks.forEach(function(t) {
        if (deletedTasks.indexOf(t.id) !== -1) return;
        var slot = document.createElement('div');
        slot.className = 'task-slot';
        slot.setAttribute('role', 'button');
        slot.setAttribute('tabindex', '0');
        slot.dataset.task = t.id;
        var isCustom = t.id.indexOf('custom-') === 0;
        var delBtn = '<button class="slot-del-btn task-del-btn" data-del-task="' + t.id + '" data-is-custom="' + isCustom + '" title="删除"><i class="fas fa-times"></i></button>';
        slot.innerHTML = delBtn +
            '<img src="' + resolveAsset(t.image) + '" alt="' + t.name + '">' +
            '<div class="task-slot-name">' + t.name + '</div>';
        container.appendChild(slot);
    });
}

var selectedTaskId = null;

function updateSidebarLock() {
    // 保留函数名但不再改变样式，仅用于状态判断
}

function bindSidebarEvents() {
    var componentSlots = document.querySelectorAll('.component-slot');
    componentSlots.forEach(function(slot) {
        slot.addEventListener('click', function(e) {
            if (e.target.closest('.slot-del-btn')) return;
            if (!selectedTaskId) {
                showAlert('未选择任务', '请先在右侧选择一个任务，再添加元件。');
                return;
            }
            var type = this.dataset.componentType;
            if (type && circuitVars) {
                circuitVars.addComponentToCanvas(type);
            }
        });
        slot.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    document.querySelectorAll('.slot-del-btn[data-del-type]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteCustomComponent(this.dataset.delType);
        });
    });

    var taskSlots = document.querySelectorAll('.task-slot');
    taskSlots.forEach(function(slot) {
        slot.addEventListener('click', function(e) {
            if (e.target.closest('.slot-del-btn')) return;
            taskSlots.forEach(function(item) { item.classList.remove('active'); });
            this.classList.add('active');
            selectedTaskId = this.dataset.task;
            updateSidebarLock();
            var nameEl = this.querySelector('.task-slot-name');
            var taskName = nameEl ? nameEl.textContent : (this.dataset.task || '');
            showToast('✅ 已选择任务：' + taskName, 'success');
        });
        slot.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    document.querySelectorAll('.slot-del-btn[data-del-task]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteCustomTask(this.dataset.delTask);
        });
    });
}

function deleteCustomComponent(type) {
    var comp = (window.__componentConfigs || []).find(function(c) { return c.type === type; });
    var compName = comp ? comp.name : '该组件';
    showConfirm('确定要删除「' + compName + '」吗？', function() {
        var isCustom = type.indexOf('custom-') === 0;
        if (isCustom) {
            var localComponents = JSON.parse(localStorage.getItem('custom_components') || '[]');
            localComponents = localComponents.filter(function(c) { return c.type !== type; });
            localStorage.setItem('custom_components', JSON.stringify(localComponents));
        } else {
            var deleted = JSON.parse(localStorage.getItem('deleted_components') || '[]');
            if (deleted.indexOf(type) === -1) deleted.push(type);
            localStorage.setItem('deleted_components', JSON.stringify(deleted));
        }

        var allComponents = (window.__componentConfigs || []).filter(function(c) {
            if (c.type === type) return false;
            if (!isCustom && JSON.parse(localStorage.getItem('deleted_components') || '[]').indexOf(c.type) !== -1) return false;
            return true;
        });
        buildComponentTypes(allComponents);
        renderSidebar(allComponents);
        bindSidebarEvents();
        if (circuitVars) {
            circuitVars.rebuildComponentTypes();
        }
        showToast('✅ 组件已删除', 'success');
    });
}

function deleteCustomTask(id) {
    var localTasks = JSON.parse(localStorage.getItem('custom_tasks') || '[]');
    var allTasks = DEFAULT_TASKS.concat(localTasks);
    var task = allTasks.find(function(t) { return t.id === id; });
    var taskName = task ? task.name : '该任务';
    showConfirm('确定要删除「' + taskName + '」吗？', function() {
        var isCustom = id.indexOf('custom-') === 0;
        if (isCustom) {
            var localTasks2 = JSON.parse(localStorage.getItem('custom_tasks') || '[]');
            localTasks2 = localTasks2.filter(function(t) { return t.id !== id; });
            localStorage.setItem('custom_tasks', JSON.stringify(localTasks2));
        } else {
            var deleted = JSON.parse(localStorage.getItem('deleted_tasks') || '[]');
            if (deleted.indexOf(id) === -1) deleted.push(id);
            localStorage.setItem('deleted_tasks', JSON.stringify(deleted));
        }

        var lt = JSON.parse(localStorage.getItem('custom_tasks') || '[]');
        var dt = JSON.parse(localStorage.getItem('deleted_tasks') || '[]');
        var remaining = DEFAULT_TASKS.concat(lt).filter(function(t) {
            return dt.indexOf(t.id) === -1;
        });
        renderTaskPanel(remaining);
        bindSidebarEvents();
        showToast('✅ 任务已删除', 'success');
    });
}

var _confirmCallback = null;
function showConfirm(message, callback) {
    _confirmCallback = callback;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').classList.add('show');
}
document.addEventListener('DOMContentLoaded', function() {
    var okBtn = document.getElementById('confirm-ok');
    var cancelBtn = document.getElementById('confirm-cancel');
    if (okBtn) okBtn.addEventListener('click', function() {
        document.getElementById('confirm-modal').classList.remove('show');
        if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
    });
    if (cancelBtn) cancelBtn.addEventListener('click', function() {
        document.getElementById('confirm-modal').classList.remove('show');
        _confirmCallback = null;
    });

    var alertOkBtn = document.getElementById('alert-ok');
    if (alertOkBtn) alertOkBtn.addEventListener('click', function() {
        document.getElementById('alert-modal').classList.remove('show');
    });
});

function showAlert(title, message) {
    document.getElementById('alert-title').textContent = title || '提示';
    document.getElementById('alert-message').textContent = message || '';
    document.getElementById('alert-modal').classList.add('show');
}

function bindModalEvents() {
    document.getElementById('add-component-btn').addEventListener('click', function() {
        document.getElementById('component-modal').classList.add('show');
    });
    document.getElementById('add-task-btn').addEventListener('click', function() {
        document.getElementById('task-modal').classList.add('show');
    });

    document.querySelectorAll('[data-close]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var modalId = this.dataset.close;
            document.getElementById(modalId).classList.remove('show');
        });
    });

    document.getElementById('save-component-btn').addEventListener('click', function() {
        saveNewComponent();
    });
    document.getElementById('save-task-btn').addEventListener('click', function() {
        saveNewTask();
    });
}

function uploadImageFile(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function() {
            reject(new Error('读取文件失败'));
        };
        reader.readAsDataURL(file);
    });
}

function saveNewComponent() {
    var name = document.getElementById('new-comp-name').value.trim();
    var imageInput = document.getElementById('new-comp-image');
    var width = 120;
    var height = 170;
    var imgW = 100;
    var imgH = 100;

    if (!name) {
        showAlert('提示', '请填写组件名称');
        return;
    }

    var type = 'custom-' + Date.now();

    var finishSave = function(imageUrl) {
        var localComponents = JSON.parse(localStorage.getItem('custom_components') || '[]');

        // Check for duplicate name
        var existing = localComponents.find(function(c) { return c.name === name; });
        if (existing) {
            showAlert('提示', '已存在名为「' + name + '」的组件，请勿重复添加');
            return;
        }

        var newComp = {
            type: type,
            name: name,
            image: imageUrl || '',
            imgW: imgW,
            imgH: imgH,
            width: width,
            height: height,
            ports: [
                { id: 'V+', label: '+', color: '#e74c3c' },
                { id: 'V-', label: '-', color: '#3498db' }
            ]
        };

        localComponents.push(newComp);
        localStorage.setItem('custom_components', JSON.stringify(localComponents));

        var allComponents = (window.__componentConfigs || []).concat([newComp]);
        buildComponentTypes(allComponents);
        renderSidebar(allComponents);
        bindSidebarEvents();
        if (circuitVars) {
            circuitVars.rebuildComponentTypes();
        }

        document.getElementById('component-modal').classList.remove('show');
        resetComponentForm();
        showToast('✅ 新组件已添加', 'success');
    };

    if (imageInput.files && imageInput.files[0]) {
        uploadImageFile(imageInput.files[0]).then(function(url) {
            finishSave(url);
        }).catch(function(err) {
            finishSave('');
        });
    } else {
        showAlert('提示', '请选择一张图片');
    }
}

function resetComponentForm() {
    document.getElementById('new-comp-name').value = '';
    document.getElementById('new-comp-image').value = '';
}

function saveNewTask() {
    var name = document.getElementById('new-task-name').value.trim();
    var imageInput = document.getElementById('new-task-image');

    if (!name) {
        showAlert('提示', '请填写任务名称');
        return;
    }

    var finishSave = function(imageUrl) {
        var localTasks = JSON.parse(localStorage.getItem('custom_tasks') || '[]');
        var newId = 'custom-' + Date.now();
        localTasks.push({ id: newId, name: name, image: imageUrl || '' });
        localStorage.setItem('custom_tasks', JSON.stringify(localTasks));

        var allTasks = DEFAULT_TASKS.concat(localTasks);
        renderTaskPanel(allTasks);
        bindSidebarEvents();

        document.getElementById('task-modal').classList.remove('show');
        document.getElementById('new-task-name').value = '';
        document.getElementById('new-task-image').value = '';
        showToast('✅ 新任务已添加', 'success');
    };

    if (imageInput.files && imageInput.files[0]) {
        uploadImageFile(imageInput.files[0]).then(function(url) {
            finishSave(url);
        }).catch(function(err) {
            finishSave('');
        });
    } else {
        showAlert('提示', '请选择一张图片');
    }
}

let circuitInitialized = false;
let circuitVars = null;

function initCircuitSimulator() {
    if (circuitInitialized) {
        circuitVars.resetAllToDefault();
        return;
    }
    circuitInitialized = true;
    
    console.log('初始化电路模拟器');
    
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    const canvasContent = document.querySelector('.canvas-content');
    
    let components = [];
    let connections = [];
    let selectedComponent = null;
    let selectedPort = null;
    let isDrawingLine = false;
    let lineStart = { x: 0, y: 0 };
    let lineEnd = { x: 0, y: 0 };
    let lineNodes = [];
    let draggedComponent = null;
    let dragOffset = { x: 0, y: 0 };
    let mode = 'select';
    let toastTimer = null;
    let selectedNode = null;
    let draggedNode = null;
    let history = [];
    let historyIndex = -1;
    let isLoadingPresetConnections = false;
    
    function saveState() {
        history = history.slice(0, historyIndex + 1);
        history.push({
            components: JSON.parse(JSON.stringify(components)),
            connections: JSON.parse(JSON.stringify(connections))
        });
        historyIndex++;
        if (history.length > 50) {
            history.shift();
            historyIndex--;
        }
    }
    
    let scoreTimer = null;
    
    function calculateScore() {
        for (const conn of connections) {
            const fromComp = components.find(c => c.id === conn.fromComponent);
            const toComp = components.find(c => c.id === conn.toComponent);
            if (!fromComp || !toComp) continue;
            
            if (fromComp.type === 'relay' && toComp.type === 'relay' && conn.fromComponent === conn.toComponent) {
                const hasBottomL = conn.fromPort === 'V+' || conn.toPort === 'V+';
                const hasTopL = conn.fromPort === 'L' || conn.toPort === 'L';
                if (hasBottomL && hasTopL) {
                    return 100;
                }
            }
        }
        return 80;
    }
    
    function playDingSound() {
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            var actx = new AudioCtx();
            var now = actx.currentTime;
            var master = actx.createGain();
            master.gain.value = 1.2;
            master.connect(actx.destination);

            var freqs = [1760, 2637];
            freqs.forEach(function(f, idx) {
                var osc = actx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = f;
                var g = actx.createGain();
                var peak = idx === 0 ? 0.95 : 0.55;
                g.gain.setValueAtTime(0.0001, now);
                g.gain.exponentialRampToValueAtTime(peak, now + 0.005);
                g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
                osc.connect(g);
                g.connect(master);
                osc.start(now);
                osc.stop(now + 0.5);
            });
        } catch (e) {}
    }

    function playAlarmSound() {
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            var actx = new AudioCtx();
            var now = actx.currentTime;
            var master = actx.createGain();
            master.gain.value = 0.4;
            master.connect(actx.destination);

            var beepTimes = [0, 0.18, 0.36];
            beepTimes.forEach(function(t) {
                var osc = actx.createOscillator();
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, now + t);
                osc.frequency.linearRampToValueAtTime(220, now + t + 0.14);
                var g = actx.createGain();
                g.gain.setValueAtTime(0.0001, now + t);
                g.gain.exponentialRampToValueAtTime(0.35, now + t + 0.01);
                g.gain.setValueAtTime(0.35, now + t + 0.12);
                g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.15);
                osc.connect(g);
                g.connect(master);
                osc.start(now + t);
                osc.stop(now + t + 0.16);
            });
        } catch (e) {}
    }

    var cheerAudioEl = null;
    function playCheerSound() {
        try {
            if (!cheerAudioEl) {
                cheerAudioEl = new Audio(resolveAsset('一大群人欢呼鼓掌的音效.mp3'));
                cheerAudioEl.preload = 'auto';
            }
            cheerAudioEl.pause();
            cheerAudioEl.currentTime = 0;
            cheerAudioEl.volume = 0.9;
            cheerAudioEl.play().then(function() {
                setTimeout(function() {
                    try {
                        var fadeSteps = 10;
                        var fadeInterval = 20;
                        var startVol = cheerAudioEl.volume;
                        var step = 0;
                        var fader = setInterval(function() {
                            step++;
                            cheerAudioEl.volume = Math.max(0, startVol * (1 - step / fadeSteps));
                            if (step >= fadeSteps) {
                                clearInterval(fader);
                                cheerAudioEl.pause();
                                cheerAudioEl.currentTime = 0;
                            }
                        }, fadeInterval);
                    } catch (e) {}
                }, 4000);
            }).catch(function() {});
        } catch (e) {}
    }

    function playFireworks() {
        try {
            var fwCanvas = document.getElementById('fireworks-canvas');
            if (!fwCanvas) {
                fwCanvas = document.createElement('canvas');
                fwCanvas.id = 'fireworks-canvas';
                fwCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
                document.body.appendChild(fwCanvas);
            }
            fwCanvas.width = window.innerWidth;
            fwCanvas.height = window.innerHeight;
            var ctx2d = fwCanvas.getContext('2d');
            var particles = [];
            var colors = ['#ff3b3b','#ffb13b','#ffe93b','#3bff7a','#3bdcff','#7a3bff','#ff3bd1','#ffffff'];

            function spawnBurst(x, y) {
                var count = 60 + Math.floor(Math.random() * 40);
                var color = colors[Math.floor(Math.random() * colors.length)];
                for (var i = 0; i < count; i++) {
                    var angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
                    var speed = 2 + Math.random() * 5;
                    particles.push({
                        x: x, y: y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1,
                        decay: 0.012 + Math.random() * 0.012,
                        size: 5 + Math.random() * 5,
                        color: Math.random() < 0.3 ? colors[Math.floor(Math.random() * colors.length)] : color,
                        gravity: 0.06
                    });
                }
            }

            function spawnConfetti() {
                for (var i = 0; i < 5; i++) {
                    particles.push({
                        x: Math.random() * fwCanvas.width,
                        y: -10,
                        vx: (Math.random() - 0.5) * 2,
                        vy: 1 + Math.random() * 2,
                        life: 1,
                        decay: 0.004,
                        size: 7 + Math.random() * 6,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        gravity: 0.02,
                        rotate: true,
                        angle: Math.random() * Math.PI * 2,
                        spin: (Math.random() - 0.5) * 0.2
                    });
                }
            }

            var burstTimes = [0, 300, 600, 900, 1300, 1700, 2200, 2700];
            burstTimes.forEach(function(t) {
                setTimeout(function() {
                    var x = fwCanvas.width * (0.15 + Math.random() * 0.7);
                    var y = fwCanvas.height * (0.2 + Math.random() * 0.4);
                    spawnBurst(x, y);
                }, t);
            });

            var startTime = Date.now();
            var totalDuration = 5000;
            var animating = true;

            function draw() {
                if (!animating) return;
                ctx2d.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
                var elapsed = Date.now() - startTime;
                if (elapsed < 3500) spawnConfetti();

                for (var i = particles.length - 1; i >= 0; i--) {
                    var p = particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += p.gravity;
                    p.life -= p.decay;
                    if (p.rotate) p.angle += p.spin;
                    if (p.life <= 0 || p.y > fwCanvas.height + 20) {
                        particles.splice(i, 1);
                        continue;
                    }
                    ctx2d.save();
                    ctx2d.globalAlpha = Math.max(0, p.life);
                    ctx2d.fillStyle = p.color;
                    if (p.rotate) {
                        ctx2d.translate(p.x, p.y);
                        ctx2d.rotate(p.angle);
                        ctx2d.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
                    } else {
                        ctx2d.beginPath();
                        ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx2d.fill();
                    }
                    ctx2d.restore();
                }

                if (elapsed > totalDuration && particles.length === 0) {
                    animating = false;
                    if (fwCanvas.parentNode) fwCanvas.parentNode.removeChild(fwCanvas);
                    return;
                }
                requestAnimationFrame(draw);
            }
            requestAnimationFrame(draw);
        } catch (e) {}
    }

    function showScore() {
        const score = calculateScore();
        const el = document.getElementById('score-display');
        if (!el) return;

        playCheerSound();
        playFireworks();

        el.textContent = score + '分';
        el.style.left = '50%';
        el.style.top = '100px';
        el.style.right = 'auto';
        el.style.transform = 'translateX(-50%)';
        el.className = 'score-display show';
        
        if (scoreTimer) {
            clearTimeout(scoreTimer);
        }
        scoreTimer = setTimeout(function() {
            el.className = 'score-display';
            scoreTimer = null;
        }, 10000);
    }
    
    function undo() {
        if (historyIndex <= 0) {
            showToast('❌ 没有可以撤回的操作', 'error');
            return;
        }

        historyIndex--;
        const prevState = history[historyIndex];

        components.forEach(function(comp) {
            const el = document.querySelector('[data-id="' + comp.id + '"]');
            if (el) el.remove();
        });

        components = prevState.components.map(function(c) {
            const config = componentTypes[c.type];
            const comp = {
                id: c.id,
                type: c.type,
                x: c.x,
                y: c.y,
                width: c.width,
                height: c.height,
                name: config.name,
                icon: config.icon,
                portsTop: config.portsTop,
                hasTopPort: config.hasTopPort,
                hasDualPorts: config.hasDualPorts,
                ports: config.ports.map(function(port, index) {
                    const numPorts = config.ports.length;
                    const spacing = c.width / (numPorts + 1);
                    const portY = config.portsTop ? 10 : c.height - 35;
                    return {
                        id: port.id,
                        label: port.label,
                        color: port.color,
                        x: spacing * (index + 1) - 8,
                        y: portY,
                        componentId: c.id
                    };
                })
            };
            if (config.hasDualPorts && config.topPorts) {
                comp.topPorts = config.topPorts.map(function(port, index) {
                    const numPorts = config.topPorts.length;
                    const spacing = c.width / (numPorts + 1);
                    return {
                        id: port.id,
                        label: port.label,
                        color: port.color,
                        x: spacing * (index + 1) - 8,
                        y: 10,
                        componentId: c.id,
                        hidden: port.hidden
                    };
                });
            }
            renderComponent(comp);
            return comp;
        });
        if (circuitVars) {
            circuitVars.components = components;
        }

        connections = prevState.connections;
        if (circuitVars) {
            circuitVars.connections = connections;
        }

        isDrawingLine = false;
        selectedPort = null;
        lineNodes = [];
        lineStart = null;
        lineEnd = null;
        selectedNode = null;
        draggedNode = null;
        selectedComponent = null;

        document.removeEventListener('click', handleLineNodeAdd);
        document.removeEventListener('click', handlePortClickForLineEnd);

        drawConnections();
        showToast('✅ 已撤回到上一步', 'success');
    }
    
    function resetConnections() {
        saveState();
        components.forEach(function(comp) {
            const el = document.querySelector('[data-id="' + comp.id + '"]');
            if (el) el.remove();
        });
        components.length = 0;
        connections.length = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        selectedComponent = null;
        selectedPort = null;
        isDrawingLine = false;
        draggedComponent = null;
        selectedNode = null;
        history.length = 0;
        historyIndex = -1;
        selectedTaskId = null;
        document.querySelectorAll('.task-slot').forEach(function(item) {
            item.classList.remove('active');
        });
        saveState();
        showToast('✅ 画布已清空', 'success');
    }

    function showToast(message, type) {
        type = type || 'info';
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        
        if (toastTimer) {
            clearTimeout(toastTimer);
        }
        
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    var componentTypes = {};
    function rebuildComponentTypes() {
        componentTypes = {};
        (window.__componentConfigs || []).forEach(function(cfg) {
            componentTypes[cfg.type] = {
                name: cfg.name,
                icon: '<img src="' + resolveAsset(cfg.image) + '" alt="' + cfg.name + '" style="width:' + cfg.imgW + 'px;height:' + cfg.imgH + 'px;object-fit:contain;border-radius:4px;">',
                width: cfg.width,
                height: cfg.height,
                portsTop: cfg.portsTop,
                hasTopPort: cfg.hasTopPort,
                hasDualPorts: cfg.hasDualPorts,
                topPorts: cfg.topPorts,
                ports: cfg.ports
            };
        });
    }
    rebuildComponentTypes();

    function resizeCanvas() {
        canvas.width = 2000;
        canvas.height = 1500;
        drawConnections();
    }

    function drawConnections() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const rect = canvasWrapper.getBoundingClientRect();
        
        connections.forEach(conn => {
            const startCompEl = document.querySelector(`[data-id="${conn.fromComponent}"]`);
            const endCompEl = document.querySelector(`[data-id="${conn.toComponent}"]`);
            
            if (!startCompEl || !endCompEl) return;
            
            const startPortEl = startCompEl.querySelector(`[data-port-id="${conn.fromPort}"] .port-circle`);
            const endPortEl = endCompEl.querySelector(`[data-port-id="${conn.toPort}"] .port-circle`);
            
            if (!startPortEl || !endPortEl) return;
            
            const startRect = startPortEl.getBoundingClientRect();
            const endRect = endPortEl.getBoundingClientRect();
            
            const startX = startRect.left + startRect.width / 2 - rect.left;
            const startY = startRect.top + startRect.height / 2 - rect.top;
            const endX = endRect.left + endRect.width / 2 - rect.left;
            const endY = endRect.top + endRect.height / 2 - rect.top;
            
            const samePair = connections.filter(c => 
                (c.fromComponent === conn.fromComponent && c.toComponent === conn.toComponent) ||
                (c.fromComponent === conn.toComponent && c.toComponent === conn.fromComponent)
            );
            
            const index = samePair.findIndex(c => c.id === conn.id);
            const offset = (index - (samePair.length - 1) / 2) * 15;
            
            const points = [{ x: startX, y: startY }].concat(conn.nodes || [], [{ x: endX, y: endY }]);
            
            if (conn.valid === false) {
                ctx.strokeStyle = '#e74c3c';
                ctx.setLineDash([8, 4]);
                drawMultiPointLine(points, '#e74c3c', offset);
                ctx.setLineDash([]);
            } else {
                ctx.strokeStyle = conn.color;
                drawMultiPointLine(points, conn.color, offset);
            }
            
            if (conn.nodes && conn.nodes.length > 0) {
                conn.nodes.forEach((node, idx) => {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.strokeStyle = conn.color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    if (selectedNode && selectedNode.connId === conn.id && selectedNode.nodeIndex === idx) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
                        ctx.strokeStyle = '#4a90d9';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([3, 3]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                });
            }
            
            const totalLength = calculatePathLength(points);
            const midPoint = getPointAtLength(points, totalLength / 2);
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(midPoint.x, midPoint.y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = conn.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = conn.color;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(conn.number, midPoint.x, midPoint.y);
        });
        
        if (isDrawingLine) {
            ctx.beginPath();
            ctx.strokeStyle = '#4a90d9';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            
            const points = [{ x: lineStart.x, y: lineStart.y }].concat(lineNodes, [{ x: lineEnd.x, y: lineEnd.y }]);
            drawMultiPointLine(points, '#4a90d9', 0);
            
            ctx.setLineDash([]);
            
            lineNodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = '#4a90d9';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }
    }

    function drawMultiPointLine(points, color, offset) {
        offset = offset || 0;
        ctx.strokeStyle = color;
        ctx.beginPath();
        
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const adjustedX = p.x + (i > 0 && i < points.length - 1 ? offset : 0);
            const adjustedY = p.y + (i > 0 && i < points.length - 1 ? offset : 0);
            
            if (i === 0) {
                ctx.moveTo(adjustedX, adjustedY);
            } else {
                const prev = points[i - 1];
                const prevX = prev.x + ((i - 1) > 0 && (i - 1) < points.length - 1 ? offset : 0);
                const prevY = prev.y + ((i - 1) > 0 && (i - 1) < points.length - 1 ? offset : 0);
                
                const midX = (prevX + adjustedX) / 2;
                ctx.lineTo(midX, prevY);
                ctx.lineTo(midX, adjustedY);
                ctx.lineTo(adjustedX, adjustedY);
            }
        }
        
        ctx.stroke();
    }

    function calculatePathLength(points) {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            length += Math.sqrt(dx * dx + dy * dy) * 2;
        }
        return length;
    }

    function getPointAtLength(points, targetLength) {
        let accumulatedLength = 0;
        
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            
            const segmentLength = Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
            
            if (accumulatedLength + segmentLength >= targetLength) {
                const remaining = targetLength - accumulatedLength;
                const midX = (p1.x + p2.x) / 2;
                
                if (remaining <= Math.abs(midX - p1.x)) {
                    const ratio = remaining / Math.abs(midX - p1.x);
                    return {
                        x: p1.x + (midX - p1.x) * ratio,
                        y: p1.y
                    };
                } else if (remaining <= Math.abs(midX - p1.x) + Math.abs(p2.y - p1.y)) {
                    const ratio = (remaining - Math.abs(midX - p1.x)) / Math.abs(p2.y - p1.y);
                    return {
                        x: midX,
                        y: p1.y + (p2.y - p1.y) * ratio
                    };
                } else {
                    const ratio = (remaining - Math.abs(midX - p1.x) - Math.abs(p2.y - p1.y)) / Math.abs(p2.x - midX);
                    return {
                        x: midX + (p2.x - midX) * ratio,
                        y: p2.y
                    };
                }
            }
            
            accumulatedLength += segmentLength;
        }
        
        return points[points.length - 1];
    }

    function createComponent(type, x, y) {
        const config = componentTypes[type];
        const compId = 'comp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const compWidth = config.width || 120;
        const compHeight = config.height || 180;
        
        const comp = {
            id: compId,
            type: type,
            x: x,
            y: y,
            width: compWidth,
            height: compHeight,
            name: config.name,
            icon: config.icon,
            portsTop: config.portsTop,
            hasTopPort: config.hasTopPort,
            hasDualPorts: config.hasDualPorts,
            ports: config.ports.map((port, index) => {
                const numPorts = config.ports.length;
                const spacing = compWidth / (numPorts + 1);
                const portY = config.portsTop ? 10 : compHeight - 35;
                return {
                    id: port.id,
                    label: port.label,
                    color: port.color,
                    x: spacing * (index + 1) - 8,
                    y: portY,
                    componentId: compId
                };
            })
        };
        
        if (config.hasDualPorts && config.topPorts) {
            comp.topPorts = config.topPorts.map((port, index) => {
                const numPorts = config.topPorts.length;
                const spacing = compWidth / (numPorts + 1);
                return {
                    id: port.id,
                    label: port.label,
                    color: port.color,
                    x: spacing * (index + 1) - 8,
                    y: 10,
                    componentId: compId,
                    hidden: port.hidden
                };
            });
        }
        
        components.push(comp);
        saveState();
        renderComponent(comp);
        return comp;
    }

    function renderComponent(comp) {
        const el = document.createElement('div');
        el.className = 'canvas-component';
        el.dataset.id = comp.id;
        el.style.left = comp.x + 'px';
        el.style.top = comp.y + 'px';
        el.style.width = comp.width + 'px';
        
        const portsHtml = '<div class="ports">' + 
            comp.ports.map(port => 
                '<div class="port" data-port-id="' + port.id + '" data-component-id="' + comp.id + '">' +
                    '<div class="port-circle" style="background: ' + port.color + ';"></div>' +
                    '<span class="port-label">' + port.label + '</span>' +
                '</div>'
            ).join('') +
            '</div>';
        
        const topPortsHtml = comp.hasDualPorts && comp.topPorts ? 
            '<div class="ports ports-top">' + 
                comp.topPorts.filter(port => !port.hidden).map(port => 
                    '<div class="port" data-port-id="' + port.id + '" data-component-id="' + comp.id + '">' +
                        '<div class="port-circle" style="background: ' + port.color + ';"></div>' +
                        '<span class="port-label">' + port.label + '</span>' +
                    '</div>'
                ).join('') +
            '</div>' : '';
        
        const topPortHtml = comp.hasTopPort ? 
            '<div class="port top-port" data-port-id="L" data-component-id="' + comp.id + '">' +
                '<div class="port-circle" style="background: #e74c3c;"></div>' +
                '<span class="port-label">L</span>' +
            '</div>' : '';
        
        if (comp.hasDualPorts) {
            el.innerHTML = topPortsHtml +
                '<div class="component-icon">' + comp.icon + '</div>' +
                '<div class="component-title">' + comp.name + '</div>' +
                portsHtml;
        } else if (comp.portsTop) {
            el.innerHTML = portsHtml +
                '<div class="component-icon">' + comp.icon + '</div>' +
                '<div class="component-title">' + comp.name + '</div>';
        } else if (comp.hasTopPort) {
            el.innerHTML = topPortHtml +
                '<div class="component-icon">' + comp.icon + '</div>' +
                '<div class="component-title">' + comp.name + '</div>' +
                portsHtml;
        } else {
            el.innerHTML = '<div class="component-icon">' + comp.icon + '</div>' +
                '<div class="component-title">' + comp.name + '</div>' +
                portsHtml;
        }
        
        el.addEventListener('mousedown', handleComponentMouseDown);
        el.addEventListener('click', handleComponentClick);
        el.addEventListener('contextmenu', handleComponentContextMenu);
        
        comp.ports.forEach(port => {
            const portEl = el.querySelector('[data-port-id="' + port.id + '"]');
            if (portEl) {
                portEl.addEventListener('mousedown', handlePortMouseDown);
                portEl.addEventListener('click', handlePortClick);
            }
        });
        
        if (comp.hasTopPort) {
            const topPortEl = el.querySelector('.top-port');
            if (topPortEl) {
                topPortEl.addEventListener('mousedown', handlePortMouseDown);
                topPortEl.addEventListener('click', handlePortClick);
            }
        }
        
        if (comp.hasDualPorts && comp.topPorts) {
            comp.topPorts.forEach(port => {
                const portEl = el.querySelector('[data-port-id="' + port.id + '"]');
                if (portEl) {
                    portEl.addEventListener('mousedown', handlePortMouseDown);
                    portEl.addEventListener('click', handlePortClick);
                }
            });
        }
        
        canvasContent.appendChild(el);
    }

    window.updateDetectorComponent = function(name, imageSrc) {
        const detector = components.find(c => c.type === 'detector');
        if (!detector || !name || !imageSrc) return;
        detector.name = name;
        detector.icon = '<img src="' + imageSrc + '" alt="' + name + '" style="width:120px;height:100px;object-fit:contain;border-radius:4px;">';
        const el = document.querySelector('[data-id="' + detector.id + '"]');
        if (el) el.remove();
        renderComponent(detector);
        drawConnections();
    };

    function updateComponentPosition(compId, x, y) {
        const comp = components.find(c => c.id === compId);
        if (comp) {
            comp.x = x;
            comp.y = y;
            
            comp.ports.forEach((port, index) => {
                const numPorts = comp.ports.length;
                const spacing = comp.width / (numPorts + 1);
                const portY = comp.portsTop ? 10 : comp.height - 35;
                port.x = spacing * (index + 1) - 8;
                port.y = portY;
            });
            
            const el = document.querySelector('[data-id="' + compId + '"]');
            if (el) {
                el.style.left = x + 'px';
                el.style.top = y + 'px';
            }
        }
    }

    function removeComponent(compId) {
        saveState();
        connections = connections.filter(
            c => c.fromComponent !== compId && c.toComponent !== compId
        );
        
        components = components.filter(c => c.id !== compId);
        
        const el = document.querySelector('[data-id="' + compId + '"]');
        if (el) {
            el.remove();
        }
        
        drawConnections();
    }

    function addConnection(fromComp, fromPort, toComp, toPort, nodes) {
        nodes = nodes || [];
        
        const existingConn = connections.find(
            c => (c.fromComponent === fromComp && c.fromPort === fromPort && c.toComponent === toComp && c.toPort === toPort) ||
                 (c.fromComponent === toComp && c.fromPort === toPort && c.toComponent === fromComp && c.toPort === fromPort)
        );
        
        if (existingConn) {
            showToast('❌ 连接已存在', 'error');
            return;
        }
        
        if (fromComp === toComp && fromPort === toPort) {
            showToast('❌ 无法连接到自身', 'error');
            return;
        }
        
        const fromComponent = components.find(c => c.id === fromComp);
        const toComponent = components.find(c => c.id === toComp);
        
        if (!fromComponent || !toComponent) {
            showToast('❌ 组件不存在', 'error');
            return;
        }
        
        const validation = validateConnection(fromComponent.type, fromPort, toComponent.type, toPort);
        
        const port = components.find(c => c.id === fromComp)?.ports.find(p => p.id === fromPort);
        
        connections.push({
            id: 'conn-' + Date.now(),
            fromComponent: fromComp,
            fromPort: fromPort,
            toComponent: toComp,
            toPort: toPort,
            color: port?.color || '#4a90d9',
            valid: validation.valid,
            number: connections.length + 1,
            nodes: nodes,
            isPreset: isLoadingPresetConnections
        });
        saveState();
        
        if (validation.valid) {
            if (!isLoadingPresetConnections) playDingSound();
            showToast('✅ ' + validation.message + ' - ' + connections.length + '号线', 'success');
        } else {
            if (!isLoadingPresetConnections) playAlarmSound();
            showToast('⚠️ ' + validation.message + ' - ' + connections.length + '号线', 'error');
        }
        
        drawConnections();
    }

    function validateConnection(fromType, fromPort, toType, toPort) {
        if ((fromType === 'sensor' && toType === 'terminal-block') ||
            (fromType === 'terminal-block' && toType === 'sensor')) {
            return { valid: true, message: '连接正确：' + getComponentName(fromType) + getPortLabel(fromType, fromPort) + ' → ' + getComponentName(toType) + getPortLabel(toType, toPort) };
        }

        if ((fromType === 'transformer' && toType === 'terminal-block') ||
            (fromType === 'terminal-block' && toType === 'transformer')) {
            return { valid: true, message: '连接正确：' + getComponentName(fromType) + getPortLabel(fromType, fromPort) + ' → ' + getComponentName(toType) + getPortLabel(toType, toPort) };
        }

        if ((fromType === 'detector' && toType === 'terminal-block') ||
            (fromType === 'terminal-block' && toType === 'detector')) {
            return { valid: true, message: '连接正确：' + getComponentName(fromType) + getPortLabel(fromType, fromPort) + ' → ' + getComponentName(toType) + getPortLabel(toType, toPort) };
        }

        if ((fromType === 'relay' && toType === 'terminal-block') ||
            (fromType === 'terminal-block' && toType === 'relay')) {
            return { valid: true, message: '连接正确：' + getComponentName(fromType) + getPortLabel(fromType, fromPort) + ' → ' + getComponentName(toType) + getPortLabel(toType, toPort) };
        }

        if ((fromType === 'buzzer' && toType === 'terminal-block') ||
            (fromType === 'terminal-block' && toType === 'buzzer')) {
            return { valid: true, message: '连接正确：' + getComponentName(fromType) + getPortLabel(fromType, fromPort) + ' → ' + getComponentName(toType) + getPortLabel(toType, toPort) };
        }

        if ((fromType === 'bulb' && toType === 'terminal-block') ||
            (fromType === 'terminal-block' && toType === 'bulb')) {
            return { valid: true, message: '连接正确：' + getComponentName(fromType) + getPortLabel(fromType, fromPort) + ' → ' + getComponentName(toType) + getPortLabel(toType, toPort) };
        }

        const rules = {
            'power-supply': {
                'L': { allowed: ['transformer', 'sensor', 'terminal-block', 'bulb'], allowedPorts: ['L', 'L1', 'L2', '6', 'V+'] },
                'N': { allowed: ['transformer', 'terminal-block', 'bulb'], allowedPorts: ['N', '2', '7', 'V-'] }
            },
            'transformer': {
                'L': { allowed: ['power-supply', 'terminal-block'], allowedPorts: ['L', '1', '6', '2'] },
                'N': { allowed: ['power-supply', 'terminal-block'], allowedPorts: ['N', '2', '7', '3'] },
                'COM': { allowed: ['sensor', 'relay', 'buzzer', 'detector', 'terminal-block'], allowedPorts: ['GND', '8', '4'] },
                'V+': { allowed: ['sensor', 'relay', 'buzzer', 'detector', 'plug', 'terminal-block'], allowedPorts: ['brown', 'V+', 'L1', 'L2', '9', '5'] }
            },
            'sensor': {
                'L1': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['L', 'V+', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
                'L2': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['L', 'V+', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
                'L': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['L', 'V+', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] }
            },
            'relay': {
                'L': { allowed: ['power-supply', 'transformer', 'relay', 'terminal-block'], allowedPorts: ['L', 'V+', '10', '9'] },
                'V+': { allowed: ['power-supply', 'transformer', 'relay', 'terminal-block'], allowedPorts: ['L', 'V+', '9'] },
                'V-': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['N', 'COM', '4', '1'] },
                'LOAD': { allowed: ['terminal-block'], allowedPorts: ['11', '12'] }
            },
            'buzzer': {
                'V+': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['L', 'V+', '5', '9', '11'] },
                'V-': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['N', 'COM', '4', '10', '8', '6'] }
            },
            'detector': {
                'V+': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['L', 'V+'] },
                'V-': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['N', 'COM', '10'] },
                'signal': { allowed: ['relay', 'terminal-block'], allowedPorts: ['V+', 'V-', '10', '8'] }
            },
            'plug': {
                'V+': { allowed: ['transformer', 'power-supply'], allowedPorts: ['V+', 'L'] },
                'V-': { allowed: ['transformer'], allowedPorts: ['COM'] }
            },
            'bulb': {
                'V+': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['L', 'V+', '5', '9'] },
                'V-': { allowed: ['power-supply', 'transformer', 'terminal-block'], allowedPorts: ['N', 'COM', '4', '10'] }
            },
            'terminal-block': {
                '1': { allowed: ['relay', 'buzzer', 'detector'], allowedPorts: ['L', 'V-', 'signal'] },
                '2': { allowed: ['transformer'], allowedPorts: ['L'] },
                '3': { allowed: ['transformer'], allowedPorts: ['N'] },
                '4': { allowed: ['transformer', 'detector'], allowedPorts: ['COM', 'signal'] },
                '5': { allowed: ['transformer', 'relay', 'buzzer', 'sensor'], allowedPorts: ['V+', 'L', 'L1', 'L2'] },
                '6': { allowed: ['sensor', 'transformer', 'power-supply', 'buzzer'], allowedPorts: ['L', 'L1', 'L2', 'L', 'V-'] },
                '7': { allowed: ['power-supply', 'transformer'], allowedPorts: ['N', 'N'] },
                '8': { allowed: ['transformer', 'detector', 'buzzer'], allowedPorts: ['COM', 'signal', 'V-'] },
                '9': { allowed: ['transformer', 'relay', 'buzzer', 'sensor'], allowedPorts: ['V+', 'L', 'L1', 'L2'] },
                '10': { allowed: ['relay', 'buzzer', 'detector'], allowedPorts: ['L', 'V-', 'signal'] },
                '11': { allowed: ['relay', 'buzzer'], allowedPorts: ['LOAD', 'V+'] },
                '12': { allowed: ['relay'], allowedPorts: ['LOAD'] }
            }
        };

        const fromRule = rules[fromType] && rules[fromType][fromPort];
        
        if (!fromRule) {
            return { valid: false, message: getComponentName(fromType) + '的' + getPortLabel(fromType, fromPort) + '端口不允许连接' };
        }
        
        if (!fromRule.allowed.includes(toType)) {
            const allowedNames = fromRule.allowed.map(function(t) { return getComponentName(t); }).join('、');
            return { valid: false, message: getComponentName(fromType) + '的' + getPortLabel(fromType, fromPort) + '只能连接到' + allowedNames };
        }
        
        if (!fromRule.allowedPorts.includes(toPort)) {
            const allowedPortLabels = fromRule.allowedPorts.map(function(p) { return getPortLabel(toType, p); }).join('、');
            return { valid: false, message: getComponentName(fromType) + '的' + getPortLabel(fromType, fromPort) + '只能连接到' + getComponentName(toType) + '的' + allowedPortLabels + '端口' };
        }
        
        return { valid: true, message: '连接正确：' + getComponentName(fromType) + getPortLabel(fromType, fromPort) + ' → ' + getComponentName(toType) + getPortLabel(toType, toPort) };
    }

    function getComponentName(type) {
        const component = components.find(function(c) { return c.type === type && c.name; });
        return (component && component.name) || (componentTypes[type] && componentTypes[type].name) || type;
    }

    function getPortLabel(type, portId) {
        const ct = componentTypes[type];
        if (ct && ct.ports) {
            const p = ct.ports.find(function(p) { return p.id === portId; });
            if (p) return p.label;
        }
        return portId;
    }

    function selectComponent(compId) {
        document.querySelectorAll('.canvas-component').forEach(function(el) {
            el.classList.remove('selected');
        });
        const compEl = document.querySelector('[data-id="' + compId + '"]');
        if (compEl) {
            compEl.classList.add('selected');
            selectedComponent = compId;
        }
    }
    
    function handleComponentMouseDown(e) {
        const compId = e.currentTarget.dataset.id;
        draggedComponent = components.find(function(c) { return c.id === compId; });
        
        if (draggedComponent) {
            const rect = e.currentTarget.getBoundingClientRect();
            dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            selectComponent(compId);
            
            if (mode === 'select') {
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            }
        }
        
        e.stopPropagation();
    }
    
    function handleComponentClick(e) {
        const compId = e.currentTarget.dataset.id;
        selectComponent(compId);
        e.stopPropagation();
    }
    
    function handlePortClick(e) {
        const compId = e.currentTarget.dataset.componentId;
        selectComponent(compId);
        e.stopPropagation();
    }
    
    function handlePortMouseDown(e) {
        e.stopPropagation();
        
        if (mode !== 'select') return;
        
        e.preventDefault();
        
        const portId = e.currentTarget.dataset.portId;
        const compId = e.currentTarget.dataset.componentId;
        
        selectComponent(compId);
        
        if (isDrawingLine && selectedPort) {
            if (selectedPort.componentId === compId && selectedPort.portId === portId) {
                showToast('❌ 无法连接到同一端口', 'error');
                isDrawingLine = false;
                selectedPort = null;
                lineNodes = [];
                lineStart = null;
                lineEnd = null;
                document.removeEventListener('click', handleLineNodeAdd);
                document.removeEventListener('click', handlePortClickForLineEnd);
                drawConnections();
                return;
            }
            
            addConnection(selectedPort.componentId, selectedPort.portId, compId, portId, lineNodes.slice());
            
            isDrawingLine = false;
            selectedPort = null;
            lineNodes = [];
            lineStart = null;
            lineEnd = null;
            
            document.removeEventListener('click', handleLineNodeAdd);
            document.removeEventListener('click', handlePortClickForLineEnd);
            
            drawConnections();
            return;
        }
        
        selectedPort = { componentId: compId, portId: portId };
        
        const comp = components.find(function(c) { return c.id === compId; });
        let port = comp && comp.ports.find(function(p) { return p.id === portId; });
        
        if (!port && comp && (comp.hasTopPort || comp.portsTop) && portId === 'L') {
            port = { id: 'L', label: 'L', color: '#e74c3c', x: 0, y: 0, componentId: compId };
        }
        
        if (comp && port) {
            const portEl = e.currentTarget.querySelector('.port-circle');
            const portRect = portEl.getBoundingClientRect();
            const canvasRect = canvasWrapper.getBoundingClientRect();
            
            lineStart = {
                x: portRect.left + portRect.width / 2 - canvasRect.left,
                y: portRect.top + portRect.height / 2 - canvasRect.top
            };
            lineEnd = lineStart;
            isDrawingLine = true;
            lineNodes = [];
            
            showToast('💡 点击画布添加拐点，点击目标端口完成连接', 'info');
            
            document.addEventListener('click', handleLineNodeAdd);
            document.addEventListener('click', handlePortClickForLineEnd);
        }
        
        e.stopPropagation();
    }

    function handleLineNodeAdd(e) {
        if (!isDrawingLine || !selectedPort) return;
        
        const target = e.target;
        if (target.classList.contains('port-circle') || 
            target.closest('.canvas-component') || 
            target.closest('.toolbar')) {
            return;
        }
        
        const rect = canvasWrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        lineNodes.push({ x: clickX, y: clickY });
        lineEnd = { x: clickX, y: clickY };
        drawConnections();
        e.stopPropagation();
    }

    function handlePortClickForLineEnd(e) {
        if (!isDrawingLine || !selectedPort) return;
        
        const portEl = e.target.closest('.port');
        if (!portEl) return;
        
        const portId = portEl.dataset.portId;
        const compId = portEl.dataset.componentId;
        
        if (selectedPort.componentId === compId && selectedPort.portId === portId) {
            return;
        }
        
        const comp = components.find(function(c) { return c.id === compId; });
        let port = comp && comp.ports.find(function(p) { return p.id === portId; });
        
        if (!port && comp && (comp.hasTopPort || comp.portsTop) && portId === 'L') {
            port = { id: 'L', label: 'L', color: '#e74c3c', x: 0, y: 0, componentId: compId };
        }
        
        if (comp && port) {
            const portCircleEl = portEl.querySelector('.port-circle');
            const portRect = portCircleEl.getBoundingClientRect();
            const canvasRect = canvasWrapper.getBoundingClientRect();
            
            lineEnd = {
                x: portRect.left + portRect.width / 2 - canvasRect.left,
                y: portRect.top + portRect.height / 2 - canvasRect.top
            };
        }
    }

    function handleMouseMove(e) {
        if (!draggedComponent) return;
        
        const rect = canvasWrapper.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, canvas.width - draggedComponent.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, canvas.height - draggedComponent.height));
        
        updateComponentPosition(draggedComponent.id, x, y);
    }

    function handleMouseUp() {
        draggedComponent = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        drawConnections();
    }

    function handleComponentContextMenu(e) {
        e.preventDefault();
        
        const compId = e.currentTarget.dataset.id;
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        
        menu.innerHTML = '<div class="context-menu-item delete" data-comp-id="' + compId + '">删除组件</div>';
        
        document.body.appendChild(menu);
        
        const deleteBtn = menu.querySelector('.delete');
        deleteBtn.addEventListener('click', function() {
            removeComponent(compId);
            menu.remove();
        });
        
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }

    function handleCanvasClick(e) {
        if (mode === 'delete-line') {
            const rect = canvasWrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const clickedConn = findConnectionAt(mouseX, mouseY);
            if (clickedConn) {
                removeConnection(clickedConn.id);
                showToast('✅ 连线已删除', 'success');
            }
            return;
        }
        
        if (mode !== 'select') return;
        
        const rect = canvasWrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        let clickedNode = null;
        
        for (let i = 0; i < connections.length; i++) {
            const conn = connections[i];
            if (!conn.nodes || conn.nodes.length === 0) continue;
            
            for (let j = 0; j < conn.nodes.length; j++) {
                const node = conn.nodes[j];
                const distance = Math.sqrt(Math.pow(mouseX - node.x, 2) + Math.pow(mouseY - node.y, 2));
                
                if (distance < 15) {
                    clickedNode = { connId: conn.id, nodeIndex: j };
                    break;
                }
            }
            
            if (clickedNode) break;
        }
        
        if (clickedNode) {
            selectedNode = clickedNode;
            drawConnections();
            return;
        }
        
        selectedNode = null;
        
        document.querySelectorAll('.canvas-component').forEach(function(el) {
            el.classList.remove('selected');
        });
        selectedComponent = null;
    }

    function findConnectionAt(x, y) {
        const rect = canvasWrapper.getBoundingClientRect();
        
        for (let i = 0; i < connections.length; i++) {
            const conn = connections[i];
            const startCompEl = document.querySelector('[data-id="' + conn.fromComponent + '"]');
            const endCompEl = document.querySelector('[data-id="' + conn.toComponent + '"]');
            
            if (!startCompEl || !endCompEl) continue;
            
            const startPortEl = startCompEl.querySelector('[data-port-id="' + conn.fromPort + '"] .port-circle');
            const endPortEl = endCompEl.querySelector('[data-port-id="' + conn.toPort + '"] .port-circle');
            
            if (!startPortEl || !endPortEl) continue;
            
            const startRect = startPortEl.getBoundingClientRect();
            const endRect = endPortEl.getBoundingClientRect();
            
            const startX = startRect.left + startRect.width / 2 - rect.left;
            const startY = startRect.top + startRect.height / 2 - rect.top;
            const endX = endRect.left + endRect.width / 2 - rect.left;
            const endY = endRect.top + endRect.height / 2 - rect.top;
            
            const midX = (startX + endX) / 2;
            
            const dist1 = pointToLineDistance(x, y, startX, startY, midX, startY);
            const dist2 = pointToLineDistance(x, y, midX, startY, midX, endY);
            const dist3 = pointToLineDistance(x, y, midX, endY, endX, endY);
            
            const minDist = Math.min(dist1, dist2, dist3);
            
            if (minDist < 15) {
                return conn;
            }
        }
        
        return null;
    }
    
    function pointToLineDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
        const nearX = x1 + t * dx;
        const nearY = y1 + t * dy;
        return Math.sqrt((px - nearX) * (px - nearX) + (py - nearY) * (py - nearY));
    }

    function removeConnection(connId) {
        saveState();
        connections = connections.filter(function(c) { return c.id !== connId; });
        drawConnections();
    }

    function handleNodeDrag(e) {
        if (!draggedNode) return;
        
        const rect = canvasWrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const conn = connections.find(function(c) { return c.id === draggedNode.connId; });
        if (conn && conn.nodes) {
            conn.nodes[draggedNode.nodeIndex] = { x: mouseX, y: mouseY };
            drawConnections();
        }
    }

    function handleNodeDragEnd() {
        draggedNode = null;
        document.removeEventListener('mousemove', handleNodeDrag);
        document.removeEventListener('mouseup', handleNodeDragEnd);
        saveState();
    }

    canvas.addEventListener('mousedown', function(e) {
        if (mode !== 'select' || !selectedNode) return;
        
        const rect = canvasWrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const conn = connections.find(function(c) { return c.id === selectedNode.connId; });
        if (conn && conn.nodes && conn.nodes[selectedNode.nodeIndex]) {
            const node = conn.nodes[selectedNode.nodeIndex];
            const distance = Math.sqrt(Math.pow(mouseX - node.x, 2) + Math.pow(mouseY - node.y, 2));
            
            if (distance < 15) {
                draggedNode = { connId: selectedNode.connId, nodeIndex: selectedNode.nodeIndex };
                document.addEventListener('mousemove', handleNodeDrag);
                document.addEventListener('mouseup', handleNodeDragEnd);
            }
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isDrawingLine) {
            isDrawingLine = false;
            selectedPort = null;
            lineNodes = [];
            lineStart = null;
            lineEnd = null;
            document.removeEventListener('click', handleLineNodeAdd);
            document.removeEventListener('click', handlePortClickForLineEnd);
            drawConnections();
            showToast('✅ 已取消连线', 'info');
            return;
        }
        
        if (e.key === 'Delete' && selectedNode) {
            const conn = connections.find(function(c) { return c.id === selectedNode.connId; });
            if (conn && conn.nodes && conn.nodes.length > 0) {
                conn.nodes.splice(selectedNode.nodeIndex, 1);
                selectedNode = null;
                saveState();
                drawConnections();
                showToast('✅ 节点已删除', 'success');
            }
        }
    });

    function setMode(newMode) {
        mode = newMode;
        
        document.querySelectorAll('.toolbar button').forEach(function(btn) {
            btn.classList.remove('active');
        });
        
        const btn = document.getElementById(newMode + '-btn');
        if (btn) btn.classList.add('active');
        
        if (mode === 'delete') {
            canvas.style.cursor = 'not-allowed';
        } else if (mode === 'delete-line') {
            canvas.style.cursor = 'crosshair';
        } else {
            canvas.style.cursor = 'default';
        }
    }

    function clearCanvas() {
        components.forEach(function(comp) {
            const el = document.querySelector('[data-id="' + comp.id + '"]');
            if (el) el.remove();
        });
        
        components = [];
        connections = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        selectedComponent = null;
        selectedPort = null;
        isDrawingLine = false;
        draggedComponent = null;
    }

    canvasWrapper.addEventListener('click', handleCanvasClick);

    saveState();

    document.getElementById('select-btn').addEventListener('click', function() { setMode('select'); });
    document.getElementById('delete-line-btn').addEventListener('click', function() { setMode('delete-line'); });
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('reset-btn').addEventListener('click', resetConnections);
    document.getElementById('submit-btn').addEventListener('click', showScore);

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function initDefaultComponents() {
        createComponent('power-supply', 200, 40);
        createComponent('transformer', 990, 60);
        createComponent('relay', 230, 400);
        createComponent('detector', 530, 480);
        createComponent('buzzer', 760, 480);
        createComponent('terminal-block', 1010, 460);
    }

    function initPresetConnections() {
        isLoadingPresetConnections = true;
        const powerSupply = components.find(function(c) { return c.type === 'power-supply'; });
        const transformer = components.find(function(c) { return c.type === 'transformer'; });

        if (powerSupply && transformer) {
            const psLPortX = powerSupply.x + powerSupply.width / 3 - 8;
            const tfLPortX = transformer.x + transformer.width / 5 - 8;
            const bottomY = Math.max(powerSupply.y + powerSupply.height, transformer.y + transformer.height) + 40;
            const lNodes = [
                { x: psLPortX, y: bottomY },
                { x: tfLPortX, y: bottomY }
            ];
            addConnection(powerSupply.id, 'L', transformer.id, 'L', lNodes);

            const psNPortX = powerSupply.x + powerSupply.width * 2 / 3 - 8;
            const tfNPortX = transformer.x + transformer.width * 2 / 5 - 8;
            const nNodes = [
                { x: psNPortX, y: bottomY + 20 },
                { x: tfNPortX, y: bottomY + 20 }
            ];
            addConnection(powerSupply.id, 'N', transformer.id, 'N', nNodes);
        }

        isLoadingPresetConnections = false;
    }

    function addComponentToCanvas(type) {
        var x = 200 + Math.random() * 400;
        var y = 100 + Math.random() * 200;
        createComponent(type, x, y);
        showToast('✅ 已添加组件到画布', 'success');
    }

    circuitVars = {
        canvas: canvas,
        ctx: ctx,
        components: components,
        connections: connections,
        addComponentToCanvas: addComponentToCanvas,
        rebuildComponentTypes: rebuildComponentTypes,
        saveState: saveState
    };
}
