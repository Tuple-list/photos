/**
 * 时光轴功能脚本
 */

// 时光轴状态
let timelineFilter = 'all';
let timelineInitialized = false;

// 初始化时光轴
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('timelineContent')) {
        console.log('Timeline: DOM loaded, initializing...');
        
        // 如果 script.js 已经加载了照片，直接使用
        if (typeof photosLoaded !== 'undefined' && photosLoaded) {
            console.log('Timeline: Using photos from script.js');
            initTimeline();
            initTimelineFilters();
            timelineInitialized = true;
            initVisibilityListener();
        } else {
            // 否则自己加载 photos.json
            console.log('Timeline: Loading photos.json directly...');
            await loadPhotosForTimeline();
        }
    }
});

// 为时光轴页面直接加载照片
async function loadPhotosForTimeline() {
    try {
        const response = await fetch('photos.json');
        if (!response.ok) {
            throw new Error('Failed to load photos.json');
        }
        const data = await response.json();
        // 设置全局 photos 变量（兼容两种方式）
        photos = data.photos || [];
        window.photos = photos;
        console.log(`Timeline: Loaded ${photos.length} photos directly`);
        
        // 合并 localStorage 中的编辑信息
        const stored = localStorage.getItem('albumPhotos');
        if (stored) {
            const storedPhotos = JSON.parse(stored);
            photos = photos.map(photo => {
                const storedPhoto = storedPhotos.find(p => p._id === photo._id);
                if (storedPhoto) {
                    return {
                        ...photo,
                        title: storedPhoto.title || photo.title,
                        date: storedPhoto.date || photo.date,
                        location: storedPhoto.location || photo.location,
                        description: storedPhoto.description || photo.description
                    };
                }
                return photo;
            });
        }
        
        initTimeline();
        initTimelineFilters();
        timelineInitialized = true;
        initVisibilityListener();
    } catch (error) {
        console.error('Timeline: Error loading photos:', error);
        photos = [];
        window.photos = photos;
        initTimeline();
        initTimelineFilters();
    }
}

// 等待 photos 加载完成
let waitAttempts = 0;
const MAX_ATTEMPTS = 50; // 最多等待5秒

function waitForPhotosAndInit() {
    // 检查 photosLoaded 标志或 photos 数组
    if (typeof photosLoaded !== 'undefined' && photosLoaded) {
        // photos 已加载完成
        console.log(`Timeline: Photos loaded, count: ${photos.length}`);
        initTimeline();
        initTimelineFilters();
        timelineInitialized = true;
        initVisibilityListener();
        return;
    }
    
    waitAttempts++;
    if (waitAttempts > MAX_ATTEMPTS) {
        console.error('Timeline: Timeout waiting for photos to load');
        // 即使超时也尝试初始化（可能为空）
        initTimeline();
        initTimelineFilters();
        return;
    }
    
    // 等待 100ms 后重试
    setTimeout(waitForPhotosAndInit, 100);
}

// 监听页面可见性变化，当用户返回时光轴页面时刷新
function initVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && timelineInitialized) {
            // 页面重新可见，检查是否需要刷新
            const stored = localStorage.getItem('albumPhotos');
            if (stored) {
                const storedPhotos = JSON.parse(stored);
                // 合并编辑信息
                if (typeof photos !== 'undefined') {
                    photos = photos.map(photo => {
                        const storedPhoto = storedPhotos.find(p => p._id === photo._id);
                        if (storedPhoto) {
                            return {
                                ...photo,
                                title: storedPhoto.title || photo.title,
                                date: storedPhoto.date || photo.date,
                                location: storedPhoto.location || photo.location,
                                description: storedPhoto.description || photo.description
                            };
                        }
                        return photo;
                    });
                    // 重新渲染时光轴
                    renderTimeline();
                    updateTimelineStats();
                }
            }
        }
    });
}

// 时光轴照片全屏查看
function openTimelineFullscreen(index, element) {
    const container = element.closest('.timeline-photos');
    const photosData = container.dataset.photos;
    
    if (!photosData) {
        console.error('No photos data found');
        return;
    }
    
    try {
        const photoList = JSON.parse(decodeURIComponent(photosData));
        const photo = photoList[index];
        
        if (!photo) {
            console.error('Photo not found at index:', index);
            return;
        }
        
        // 调用全局的 openFullscreen 函数
        openFullscreen(
            photo.url,
            photo.title,
            photo.date,
            photo.location || '',
            photo.description || '',
            index,
            photoList
        );
    } catch (e) {
        console.error('Error opening fullscreen:', e);
    }
}

// 初始化时光轴
function initTimeline() {
    renderTimeline();
    updateTimelineStats();
    initScrollAnimation();
}

// 渲染时光轴
function renderTimeline() {
    const container = document.getElementById('timelineContent');
    const quickNav = document.getElementById('quickNav');
    
    if (!container) return;
    
    // 按日期分组照片
    const grouped = groupPhotosByDate(photos, timelineFilter);
    
    // 获取所有年份用于导航
    const years = [...new Set(photos.map(p => p.date?.split('-')[0] || '未知'))]
        .filter(y => y !== '未知')
        .sort()
        .reverse();
    
    // 渲染快速导航
    if (quickNav) {
        quickNav.innerHTML = `
            <div class="quick-nav-title">快速跳转</div>
            ${years.map(year => `
                <button class="quick-nav-year" onclick="scrollToYear('${year}')">${year}</button>
            `).join('')}
        `;
    }
    
    // 渲染时光轴内容
    let html = '';
    let currentYear = '';
    let delay = 0;
    
    Object.entries(grouped).forEach(([dateKey, photoList]) => {
        const year = dateKey.split('-')[0];
        const date = parseDate(dateKey);
        const isUncategorized = dateKey === '未分类';
        
        // 年份标记（未分类不显示年份标记）
        if (!isUncategorized && year !== currentYear && year !== '未知') {
            html += `
                <div class="timeline-year-marker" id="year-${year}">
                    <span class="timeline-year-text">${year}年</span>
                </div>
            `;
            currentYear = year;
        }
        
        // 日期分组
        const dateStr = formatTimelineDate(date, timelineFilter, dateKey);
        const weekday = isUncategorized ? '待定' : getWeekday(date);
        
        html += `
            <div class="timeline-group" style="animation-delay: ${delay * 0.1}s">
                <div class="timeline-node"></div>
                <div class="timeline-date-label">
                    <span class="timeline-date-main">${dateStr}</span>
                    <span class="timeline-date-sub">${weekday} · ${photoList.length}张照片</span>
                </div>
                <div class="timeline-photos" data-photos="${encodeURIComponent(JSON.stringify(photoList))}">
                    ${photoList.map((photo, idx) => `
                        <div class="timeline-photo-item" onclick="openTimelineFullscreen(${idx}, this)"><img src="${photo.url}" alt="${photo.title}" loading="lazy">
                            ${(photo.location || photo.description) ? '<span class="timeline-info-badge">📝</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        delay++;
    });
    
    if (html === '') {
        html = `
            <div class="timeline-empty">
                <div class="timeline-empty-icon">📷</div>
                <h3>暂无照片</h3>
                <p>在相册中添加照片，时光轴会自动整理展示</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// 按日期分组照片
function groupPhotosByDate(photos, filter) {
    const grouped = {};
    const noDatePhotos = [];
    
    photos.forEach(photo => {
        // 如果没有日期，归入未分类
        if (!photo.date || photo.date.trim() === '') {
            noDatePhotos.push(photo);
            return;
        }
        
        let key;
        const parts = photo.date.split('-');
        const year = parts[0];
        const month = parts[1];
        
        switch (filter) {
            case 'year':
                key = year;
                break;
            case 'month':
                key = `${year}-${month}`;
                break;
            case 'all':
            default:
                key = photo.date;
        }
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(photo);
    });
    
    // 如果有未分类照片，添加到最后
    if (noDatePhotos.length > 0) {
        grouped['未分类'] = noDatePhotos;
    }
    
    // 按日期倒序排序（未分类放在最后）
    const sorted = Object.fromEntries(
        Object.entries(grouped).sort((a, b) => {
            if (a[0] === '未分类') return 1;
            if (b[0] === '未分类') return -1;
            return b[0].localeCompare(a[0]);
        })
    );
    
    return sorted;
}

// 解析日期
function parseDate(dateStr) {
    if (!dateStr || dateStr === '未知' || dateStr === '未分类') return null;
    const parts = dateStr.split('-');
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}

// 格式化日期显示
function formatTimelineDate(date, filter, dateKey) {
    // 处理未分类
    if (dateKey === '未分类' || !date) {
        return '未分类';
    }
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    switch (filter) {
        case 'year':
            return `${year}年`;
        case 'month':
            return `${year}年${month}月`;
        case 'all':
        default:
            return `${month}月${day}日`;
    }
}

// 获取星期几
function getWeekday(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
}

// 滚动到指定年份
function scrollToYear(year) {
    const element = document.getElementById(`year-${year}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // 更新导航激活状态
    document.querySelectorAll('.quick-nav-year').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(year));
    });
}

// 初始化筛选按钮
function initTimelineFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            timelineFilter = btn.dataset.filter;
            renderTimeline();
        });
    });
}

// 更新时光轴统计
function updateTimelineStats() {
    const totalEl = document.getElementById('timelineTotal');
    const yearsEl = document.getElementById('timelineYears');
    const memoriesEl = document.getElementById('timelineMemories');
    
    if (totalEl) totalEl.textContent = photos.length;
    
    if (yearsEl) {
        const years = new Set(photos.map(p => p.date?.split('-')[0]).filter(Boolean));
        yearsEl.textContent = years.size;
    }
    
    if (memoriesEl) {
        // 计算"珍贵回忆"数量（有地点信息的照片）
        const memories = photos.filter(p => p.location && p.location !== '未知').length;
        memoriesEl.textContent = memories;
    }
}

// 滚动动画
function initScrollAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    document.querySelectorAll('.timeline-group').forEach(group => {
        observer.observe(group);
    });
}

// 导出全局函数
window.scrollToYear = scrollToYear;
