// 分类数据
const categories = [
    { id: 'category1', name: '上学时光', icon: 'https://image2url.com/r2/default/images/1772020280500-39120bd6-4903-4e8b-863c-83d50ebda5a5.jpg', location: '甘肃', tags: ['童年回忆', '成长足迹'] },
    { id: 'category2', name: '大学', icon: 'https://image2url.com/r2/default/images/1772020391839-4b0488ab-62bd-4bf2-9587-6a3bb2f14538.jpg', location: '成都', tags: ['青春岁月', '梦想起航'] },
    { id: 'category3', name: '大漠孤烟直', icon: 'https://image2url.com/r2/default/images/1772020472008-e64b61e9-09bc-4ab2-acc9-3cf15f3aa9be.jpg', location: '嘉峪关', tags: ['西北风光', '壮阔山河'] },
    { id: 'category4', name: '朋友-新的旅途', icon: 'https://image2url.com/r2/default/images/1772020536634-129b43f9-44ab-4cec-b786-9e627af397d6.jpg', location: '甘肃', tags: ['友谊长存', '美好回忆'] },
    { id: 'category5', name: '樱花季', icon: 'https://image2url.com/r2/default/images/1772020753472-bbb30831-c116-4023-81c8-fb300f4bc513.jpg', location: '武汉', tags: ['春日赏花', '粉色浪漫'] },
    { id: 'category6', name: '其他', icon: 'https://image2url.com/r2/default/images/1772020632551-f273712d-fbc8-4b09-8f98-fc2fd4663bdb.jpg', location: 'all', tags: ['生活点滴', '随手拍'] }
];

// 照片数据 - 从 photos.json 异步加载
let photos = [];

// 照片数据加载完成标志
let photosLoaded = false;

// 异步加载照片数据
async function loadPhotos() {
    try {
        console.log('Loading photos.json...');
        const response = await fetch('photos.json');
        if (!response.ok) {
            throw new Error('Failed to load photos.json');
        }
        const data = await response.json();
        photos = data.photos || [];
        photosLoaded = true;
        console.log(`Loaded ${photos.length} photos from photos.json`);
        
        // 默认使用 photos.json 中的数据
        // 如果需要从 localStorage 恢复，取消下面一行的注释
        // loadPhotosFromStorage();
        
        // 加载完成后渲染页面
        renderCategories();
        updateStats();
    } catch (error) {
        console.error('Error loading photos:', error);
        photos = [];
        photosLoaded = true;
        renderCategories();
        updateStats();
    }
}

// 初始化
function init() {
    loadPhotos();
}

// 渲染分类网格
function renderCategories() {
    const grid = document.getElementById('categoryGrid');
    // 如果在时光轴页面，没有 categoryGrid 元素，直接返回
    if (!grid) return;
    
    grid.innerHTML = categories.map(cat => `
        <div class="category-card" onclick="openCategory('${cat.id}', '${cat.name}')">
            <img src="${cat.icon}" alt="${cat.name}" class="category-image">
            <div class="category-content">
                <h3 class="category-name">${cat.name}</h3>
                <p class="category-location"><span class="location-tag">▼</span> ${cat.location}</p>
                <p class="category-count">${getCategoryPhotoCount(cat.id)} 张照片</p>
                <div class="category-tags">
                    ${cat.tags.map(tag => `<span class="category-tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// 获取分类照片数量
function getCategoryPhotoCount(categoryId) {
    return photos.filter(photo => photo.categoryId === categoryId).length;
}

// 打开分类
function openCategory(categoryId, categoryName) {
    console.log(`Opening category: ${categoryId}, total photos: ${photos.length}`);
    document.getElementById('categoryGrid').style.display = 'none';
    document.querySelector('.header').style.display = 'none';
    document.getElementById('categoryPage').style.display = 'block';
    document.getElementById('categoryTitle').textContent = categoryName;
    
    const categoryPhotos = photos.filter(photo => photo.categoryId === categoryId);
    console.log(`Found ${categoryPhotos.length} photos in category ${categoryId}`);
    renderPhotoGrid(categoryPhotos);
    
    // 滚动到页面顶部
    window.scrollTo(0, 0);
}

// 渲染照片网格（带懒加载）
function renderPhotoGrid(categoryPhotos) {
    const grid = document.getElementById('photoGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (categoryPhotos.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    // 清空现有内容
    grid.innerHTML = '';
    
    // 创建照片元素，使用 Intersection Observer 实现懒加载
    categoryPhotos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.onclick = () => openFullscreen(photo.url, photo.title, photo.date, photo.location, photo.description, index, categoryPhotos);
        
        // 创建占位符
        const placeholder = document.createElement('div');
        placeholder.className = 'photo-placeholder';
        photoItem.appendChild(placeholder);
        
        // 创建图片元素，初始不加载
        const img = document.createElement('img');
        img.dataset.src = photo.url;
        img.alt = photo.title;
        img.className = 'lazy-photo';
        
        // 前 6 张图片直接加载，其余的懒加载
        if (index < 6) {
            img.src = photo.url;
            img.classList.add('loaded');
            placeholder.style.display = 'none';
        }
        
        photoItem.appendChild(img);
        
        // 添加信息指示器
        if (photo.date || photo.location || photo.description) {
            const infoIndicator = document.createElement('div');
            infoIndicator.className = 'photo-info-indicator';
            infoIndicator.innerHTML = '📝';
            photoItem.appendChild(infoIndicator);
        }
        
        grid.appendChild(photoItem);
    });
    
    // 初始化懒加载
    initLazyLoad();
}

// 懒加载初始化
function initLazyLoad() {
    // 如果浏览器支持 Intersection Observer
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const photoItem = img.parentElement;
                    const placeholder = photoItem.querySelector('.photo-placeholder');
                    
                    // 加载图片
                    img.src = img.dataset.src;
                    img.onload = () => {
                        img.classList.add('loaded');
                        if (placeholder) {
                            placeholder.style.display = 'none';
                        }
                    };
                    
                    // 停止观察这张图片
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px', // 提前 50px 开始加载
            threshold: 0.01
        });
        
        // 观察所有未加载的图片
        document.querySelectorAll('.lazy-photo:not(.loaded)').forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // 不支持 Intersection Observer 的浏览器，直接加载所有图片
        document.querySelectorAll('.lazy-photo:not(.loaded)').forEach(img => {
            img.src = img.dataset.src;
            img.classList.add('loaded');
        });
    }
}

// 返回主页
function backToHome() {
    document.getElementById('categoryPage').style.display = 'none';
    document.getElementById('categoryGrid').style.display = 'grid';
    document.querySelector('.header').style.display = 'block';
}

// 当前查看的照片索引
let currentPhotoIndex = -1;
let currentCategoryPhotos = [];

// 全屏查看
function openFullscreen(url, title, date, location, description, index, categoryPhotos) {
    const modal = document.getElementById('fullscreenModal');
    const img = document.getElementById('fullscreenImage');
    const titleEl = document.getElementById('fullscreenTitle');
    const descEl = document.getElementById('fullscreenDesc');
    
    // 保存当前照片信息
    currentPhotoIndex = index;
    // 处理 categoryPhotos 参数，确保它是一个数组
    if (typeof categoryPhotos === 'string') {
        try {
            currentCategoryPhotos = JSON.parse(categoryPhotos);
        } catch (e) {
            currentCategoryPhotos = [];
        }
    } else {
        currentCategoryPhotos = categoryPhotos || [];
    }
    
    // 查找当前照片的完整数据
    const photo = currentCategoryPhotos[index] || { url, title, date, location, description };
    
    img.src = photo.url;
    img.dataset.index = index;
    // 全屏查看时显示分类名称，不显示照片编号
    const category = categories.find(c => c.id === photo.categoryId);
    const categoryName = category ? category.name : '';
    titleEl.textContent = categoryName;
    
    // 构建描述信息
    let infoParts = [];
    if (photo.date) infoParts.push(photo.date);
    if (photo.location && photo.location !== '未知') infoParts.push(photo.location);
    if (photo.description) infoParts.push(photo.description);
    descEl.textContent = infoParts.join(' · ') || '';
    
    // 添加编辑按钮
    addEditButton(photo);
    
    modal.classList.add('active');
}

// 添加编辑按钮
function addEditButton(photo) {
    // 移除已有的编辑按钮
    const existingBtn = document.querySelector('.photo-edit-btn');
    if (existingBtn) existingBtn.remove();
    
    // 只在相册页面添加编辑按钮
    const isTimelinePage = document.getElementById('timelineContent');
    if (isTimelinePage) return;
    
    const modal = document.getElementById('fullscreenModal');
    const editBtn = document.createElement('button');
    editBtn.className = 'photo-edit-btn';
    editBtn.innerHTML = '✏️ 编辑信息';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        openEditModal(photo);
    };
    modal.appendChild(editBtn);
}

// 打开编辑模态框
function openEditModal(photo) {
    // 只在相册页面允许编辑
    const isTimelinePage = document.getElementById('timelineContent');
    if (isTimelinePage) return;
    
    // 创建编辑模态框
    let editModal = document.getElementById('editModal');
    if (!editModal) {
        editModal = document.createElement('div');
        editModal.id = 'editModal';
        editModal.className = 'edit-modal';
        editModal.innerHTML = `
            <div class="edit-modal-overlay" onclick="closeEditModal()"></div>
            <div class="edit-modal-content">
                <h3>✏️ 编辑照片信息</h3>
                <div class="edit-form">
                    <div class="edit-field">
                        <label>日期</label>
                        <input type="date" id="editDate" class="edit-input">
                    </div>
                    <div class="edit-field">
                        <label>地点</label>
                        <input type="text" id="editLocation" class="edit-input" placeholder="例如：北京市朝阳区">
                    </div>
                    <div class="edit-field">
                        <label>描述</label>
                        <textarea id="editDescription" class="edit-input edit-textarea" placeholder="添加照片描述..."></textarea>
                    </div>
                </div>
                <div class="edit-actions">
                    <button class="edit-btn btn-secondary" onclick="closeEditModal()">取消</button>
                    <button class="edit-btn btn-primary" onclick="savePhotoInfo()">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(editModal);
    }
    
    // 填充当前值
    const dateInput = document.getElementById('editDate');
    const locationInput = document.getElementById('editLocation');
    const descInput = document.getElementById('editDescription');
    
    // 设置日期值
    if (photo.date) {
        dateInput.value = photo.date;
    }
    locationInput.value = photo.location || '';
    descInput.value = photo.description || '';
    
    // 保存当前编辑的照片ID
    editModal.dataset.photoId = photo._id || '';
    
    editModal.classList.add('active');
}

// 关闭编辑模态框
function closeEditModal() {
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.classList.remove('active');
    }
}

// 保存照片信息
function savePhotoInfo() {
    // 只在相册页面允许保存
    const isTimelinePage = document.getElementById('timelineContent');
    if (isTimelinePage) return;
    
    const editModal = document.getElementById('editModal');
    const photoId = editModal.dataset.photoId;
    
    const dateValue = document.getElementById('editDate').value;
    const location = document.getElementById('editLocation').value.trim();
    const description = document.getElementById('editDescription').value.trim();
    
    // 更新照片数据
    const photoIndex = photos.findIndex(p => p._id === photoId);
    if (photoIndex !== -1) {
        console.log('Saving photo:', photoId, 'description:', description);
        photos[photoIndex].date = dateValue || '';
        photos[photoIndex].location = location || '未知';
        photos[photoIndex].description = description; // 允许空字符串
        
        console.log('Updated photo:', photos[photoIndex]);
        
        // 保存到本地存储
        savePhotosToStorage();
        
        // 刷新显示
        updateStats();
        renderCategories();
        
        // 如果当前在分类页面，刷新照片网格
        const categoryPage = document.getElementById('categoryPage');
        if (categoryPage && categoryPage.style.display !== 'none') {
            const categoryTitle = document.getElementById('categoryTitle').textContent;
            const category = categories.find(c => c.name === categoryTitle);
            if (category) {
                const categoryPhotos = photos.filter(p => p.categoryId === category.id);
                renderPhotoGrid(categoryPhotos);
            }
        }
        
        // 更新全屏显示
        const fullscreenModal = document.getElementById('fullscreenModal');
        if (fullscreenModal && fullscreenModal.classList.contains('active')) {
            const updatedPhoto = photos[photoIndex];
            const titleEl = document.getElementById('fullscreenTitle');
            const descEl = document.getElementById('fullscreenDesc');
            
            // 更新标题（显示分类名称）
            const category = categories.find(c => c.id === updatedPhoto.categoryId);
            const categoryName = category ? category.name : '';
            titleEl.textContent = categoryName;
            
            // 重新构建描述信息
            let infoParts = [];
            if (updatedPhoto.date) infoParts.push(updatedPhoto.date);
            if (updatedPhoto.location && updatedPhoto.location !== '未知') infoParts.push(updatedPhoto.location);
            if (updatedPhoto.description) infoParts.push(updatedPhoto.description);
            descEl.textContent = infoParts.join(' · ') || '';
            
            // 更新编辑按钮绑定的照片数据
            addEditButton(updatedPhoto);
        }
        
        showToast('✅ 照片信息已保存');
    }
    
    closeEditModal();
}

// 保存照片到本地存储
function savePhotosToStorage() {
    try {
        localStorage.setItem('albumPhotos', JSON.stringify(photos));
        console.log('Saved to localStorage:', photos.length, 'photos');
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

// 从本地存储加载照片（合并编辑信息）
function loadPhotosFromStorage() {
    try {
        const stored = localStorage.getItem('albumPhotos');
        if (!stored) {
            console.log('No stored photos found in localStorage');
            return;
        }
        
        const storedPhotos = JSON.parse(stored);
        console.log('Loading from localStorage:', storedPhotos.length, 'photos');
        
        if (!photos || photos.length === 0) {
            console.warn('photos array is empty, cannot merge');
            return;
        }
        
        // 合并：保留 photos.json 的 URL，恢复 localStorage 的编辑信息
        photos = photos.map(photo => {
            const storedPhoto = storedPhotos.find(p => p._id === photo._id);
            if (storedPhoto) {
                console.log('Merging photo:', photo._id, 'stored desc:', storedPhoto.description, 'current desc:', photo.description);
                return {
                    ...photo,
                    title: storedPhoto.title !== undefined ? storedPhoto.title : photo.title,
                    date: storedPhoto.date !== undefined ? storedPhoto.date : photo.date,
                    location: storedPhoto.location !== undefined ? storedPhoto.location : photo.location,
                    description: storedPhoto.description !== undefined ? storedPhoto.description : photo.description
                };
            }
            return photo;
        });
        
        // 重新渲染
        if (document.getElementById('categoryGrid')) {
            renderCategories();
            updateStats();
        }
        // 如果在时光轴页面且 initTimeline 函数存在，重新渲染时光轴
        if (document.getElementById('timelineContent') && typeof initTimeline === 'function') {
            initTimeline();
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }
}

// 显示提示
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        z-index: 10000;
        animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// 关闭全屏
function closeFullscreen() {
    document.getElementById('fullscreenModal').classList.remove('active');
}

// 更新统计
function updateStats() {
    const totalPhotosEl = document.getElementById('totalPhotos');
    const totalLocationsEl = document.getElementById('totalLocations');
    
    // 如果在时光轴页面，这些元素不存在
    if (!totalPhotosEl || !totalLocationsEl) return;
    
    totalPhotosEl.textContent = photos.length;
    
    const locations = new Set();
    photos.forEach(photo => {
        if (photo.location && photo.location !== '未知') {
            locations.add(photo.location);
        }
    });
    totalLocationsEl.textContent = locations.size;
}

// 导出编辑后的照片数据为 JSON 文件
function exportPhotosToJSON() {
    if (!photos || photos.length === 0) {
        showToast('❌ 没有可导出的照片数据');
        return;
    }
    
    // 构建导出的数据结构
    const exportData = {
        photos: photos.map(photo => ({
            _id: photo._id,
            categoryId: photo.categoryId,
            title: photo.title,
            date: photo.date || '',
            location: photo.location || '未知',
            description: photo.description || '',
            url: photo.url
        }))
    };
    
    // 转换为 JSON 字符串（格式化）
    const jsonStr = JSON.stringify(exportData, null, 2);
    
    // 创建 Blob 对象
    const blob = new Blob([jsonStr], { type: 'application/json' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 生成文件名（包含日期时间）
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `photos_export_${dateStr}.json`;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放 URL 对象
    URL.revokeObjectURL(url);
    
    showToast('✅ 照片数据已导出');
    console.log('Exported photos:', photos.length);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    // 从本地存储加载照片
    loadPhotosFromStorage();
    init();
    initTheme();
    updateRuntime();
    setInterval(updateRuntime, 1000);
    initStarryBackground();
});

// 键盘事件
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeFullscreen();
    }
});

// ==================== 主题切换功能 ====================

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// 切换主题
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// 设置主题
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // 更新图标和文字
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    
    if (theme === 'dark') {
        icon.textContent = '☀️';
        text.textContent = '日间模式';
    } else {
        icon.textContent = '🌙';
        text.textContent = '夜间模式';
    }
}

// ==================== 运行时间计算 ====================

// 网站创建时间（可以根据实际情况修改）
const SITE_CREATED_DATE = new Date('2026-02-26');

// 更新运行时间（精确到秒）
function updateRuntime() {
    const now = new Date();
    const diffTime = now - SITE_CREATED_DATE;
    
    // 计算天、时、分、秒
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);
    
    const runtimeElement = document.getElementById('runtime');
    if (runtimeElement) {
        // 格式：X天X时X分X秒
        runtimeElement.textContent = `${days}天${hours}时${minutes}分${seconds}秒`;
    }
}

// ==================== 动态星空背景 ====================

function initStarryBackground() {
    const canvas = document.getElementById('starCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const header = document.querySelector('.header');
    
    // 设置画布大小
    function resizeCanvas() {
        canvas.width = header.offsetWidth;
        canvas.height = header.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 星星类
    class Star {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.brightness = Math.random();
            this.twinkleSpeed = Math.random() * 0.02 + 0.01;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.brightness += this.twinkleSpeed;
            
            if (this.brightness > 1 || this.brightness < 0) {
                this.twinkleSpeed = -this.twinkleSpeed;
            }
            
            // 边界检查
            if (this.x < 0 || this.x > canvas.width || 
                this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        
        draw() {
            const alpha = Math.abs(this.brightness) * 0.8 + 0.2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
            
            // 添加光晕效果
            if (this.size > 1.5) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
                ctx.fill();
            }
        }
    }
    
    // 流星类
    class Meteor {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * canvas.width + 200;
            this.y = -100;
            this.length = Math.random() * 80 + 50;
            this.speed = Math.random() * 8 + 5;
            this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
            this.opacity = 0;
            this.active = false;
            this.waitTime = Math.random() * 200 + 100;
        }
        
        update() {
            if (!this.active) {
                this.waitTime--;
                if (this.waitTime <= 0) {
                    this.active = true;
                    this.opacity = 1;
                }
                return;
            }
            
            this.x -= Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            
            // 淡出效果
            if (this.x < -this.length || this.y > canvas.height + this.length) {
                this.reset();
            }
        }
        
        draw() {
            if (!this.active) return;
            
            const tailX = this.x + Math.cos(this.angle) * this.length;
            const tailY = this.y - Math.sin(this.angle) * this.length;
            
            const gradient = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
            gradient.addColorStop(0.1, `rgba(168, 216, 234, ${this.opacity * 0.8})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(tailX, tailY);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            // 流星头部光点
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
            
            // 头部光晕
            ctx.beginPath();
            ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(168, 216, 234, ${this.opacity * 0.5})`;
            ctx.fill();
        }
    }
    
    // 创建星星和流星
    const stars = [];
    const meteors = [];
    
    for (let i = 0; i < 100; i++) {
        stars.push(new Star());
    }
    
    for (let i = 0; i < 3; i++) {
        meteors.push(new Meteor());
    }
    
    // 动画循环
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制星星
        stars.forEach(star => {
            star.update();
            star.draw();
        });
        
        // 绘制流星
        meteors.forEach(meteor => {
            meteor.update();
            meteor.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}


