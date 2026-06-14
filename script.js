// Spc Unblockers Main Script
// Games data is loaded from games.js

 // State management
let currentCategory = 'all';
let searchQuery = '';
let favorites = JSON.parse(localStorage.getItem('spc_favorites') || '[]');
let recentlyPlayed = JSON.parse(localStorage.getItem('spc_recent') || '[]');

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {

    // Elements
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const searchInput = document.getElementById('searchInput');
    const gameGrid = document.getElementById('gameGrid');
    const newGrid = document.getElementById('newGrid');
    const relatedGrid = document.getElementById('relatedGrid');

    // Initialize sidebar toggle
    initSidebarToggle(sidebar, menuToggle);

    // Initialize search
    initSearch(searchInput);

    // Initialize category filtering
    initCategoryFiltering();

    // Render game grids if on index page
    if (gameGrid && newGrid) {
        renderGameGrids(gameGrid, newGrid);
        renderRecentlyPlayed();
    }

    // Random Game button
    const randomBtn = document.getElementById('randomGame');
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            const randomGame = gamesDatabase[Math.floor(Math.random() * gamesDatabase.length)];
            window.location.href = `game.html?id=${randomGame.id}`;
        });
    }

    // Clear Recent button
    const clearRecentBtn = document.getElementById('clearRecent');
    if (clearRecentBtn) {
        clearRecentBtn.addEventListener('click', () => {
            recentlyPlayed = [];
            localStorage.setItem('spc_recent', JSON.stringify(recentlyPlayed));
            renderRecentlyPlayed();
            showNotification('History cleared', 'info');
        });
    }

    // Initialize game player if on game page
    if (document.getElementById('gameIframe')) {
        initGamePlayer();
    }

    // Close sidebar when clicking outside on mobile
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && !sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
        }
    });

    // Sync overlay state with sidebar
    if (sidebar && overlay) {
        const observer = new MutationObserver(() => {
            if (sidebar.classList.contains('mobile-open')) {
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
            }
        });
        observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    // Hero button functionality - scroll to games or launch first game
    const heroBtn = document.querySelector('.btn-hero');
    if (heroBtn) {
        heroBtn.addEventListener('click', () => {
            const gameGrid = document.getElementById('gameGrid');
            if (gameGrid) {
                gameGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    initCommunityAuth();

    // Breadcrumb update on game page
    const breadcrumbGame = document.getElementById('breadcrumbGame');
    if (breadcrumbGame) {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('id');
        const game = gamesDatabase.find(g => g.id === gameId);
        if (game) {
            breadcrumbGame.textContent = game.title;
        }
    }

    // Add back to top button
    initBackToTop();

    // Initialize Advanced Features (Game Page)
    if (document.getElementById('fullscreenBtn')) {
        initAdvancedFeatures();
    }
});

// Advanced Features (Fullscreen, Share, Ratings)
function initAdvancedFeatures() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const shareBtn = document.getElementById('shareBtn');
    const ratingContainer = document.getElementById('ratingContainer');
    const gameIframe = document.getElementById('gameIframe');
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');

    // Fullscreen
    if (fullscreenBtn && gameIframe) {
        fullscreenBtn.addEventListener('click', () => {
            if (gameIframe.requestFullscreen) {
                gameIframe.requestFullscreen();
            } else if (gameIframe.webkitRequestFullscreen) {
                gameIframe.webkitRequestFullscreen();
            } else if (gameIframe.msRequestFullscreen) {
                gameIframe.msRequestFullscreen();
            }
        });
    }

    // Share
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showNotification('Game link copied to clipboard!', 'info');
            });
        });
    }

    // Ratings
    if (ratingContainer) {
        const stars = ratingContainer.querySelectorAll('.star');
        const ratingStatus = document.getElementById('ratingStatus');
        
        // Load existing rating
        const ratings = JSON.parse(localStorage.getItem('spc_ratings') || '{}');
        const currentRating = ratings[gameId];
        if (currentRating) {
            updateStarUI(stars, currentRating);
            ratingStatus.textContent = `Your rating: ${currentRating} stars`;
        }

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-value'));
                ratings[gameId] = val;
                localStorage.setItem('spc_ratings', JSON.stringify(ratings));
                updateStarUI(stars, val);
                ratingStatus.textContent = 'Thanks for rating!';
                showNotification('Rating saved!', 'success');
            });

            star.addEventListener('mouseenter', () => {
                updateStarUI(stars, parseInt(star.getAttribute('data-value')));
            });

            star.addEventListener('mouseleave', () => {
                updateStarUI(stars, ratings[gameId] || 0);
            });
        });
    }
}

function updateStarUI(stars, val) {
    stars.forEach(star => {
        const starVal = parseInt(star.getAttribute('data-value'));
        if (starVal <= val) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Sidebar toggle functionality
function initSidebarToggle(sidebar, menuToggle) {
    if (!menuToggle || !sidebar) return;

    menuToggle.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    });

    // Handle resize events
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('mobile-open');
        }
    });
}

// Lazy loading for premium image reveals
function initLazyLoading() {
    const images = document.querySelectorAll('img.lazy-load');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.getAttribute('data-src');
                img.onload = () => img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });

    images.forEach(img => imageObserver.observe(img));
}


// Search functionality with real-time filtering
function initSearch(searchInput) {
    if (!searchInput) return;

    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        searchQuery = e.target.value.toLowerCase().trim();

        debounceTimer = setTimeout(() => {
            filterGames();
        }, 150);
    });

    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchQuery = '';
            filterGames();
        }
    });
}

// Category filtering - make nav links functional
function initCategoryFiltering() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(navItem => {
        navItem.addEventListener('click', (e) => {
            // Skip home link
            if (navItem.getAttribute('href') === 'index.html') return;

            e.preventDefault();

            // Get category from text content or data attribute
            const categoryText = navItem.textContent.trim();
            
            // Check if Community is clicked
            if (categoryText === 'Community') {
                showCommunityTab();
                // Close mobile sidebar
                const sidebar = document.getElementById('sidebar');
                if (sidebar && window.innerWidth <= 768) {
                    sidebar.classList.remove('mobile-open');
                }
                return;
            } else {
                showGamesTab();
            }

            const category = categoryText === 'Action' ? 'Action' :
                            categoryText === 'Driving' ? 'Driving' :
                            categoryText === 'Popular' ? 'Action' :
                            categoryText === '2 Player' ? 'Multiplayer' :
                            categoryText === 'Unblocked Apps' ? 'Apps' :
                            categoryText;

            // Update active state
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            navItem.classList.add('active');

            // Set current category
            currentCategory = category.toLowerCase() === 'all' ? 'all' : category;

            // Filter and display games
            filterGames();

            // Close mobile sidebar
            const sidebar = document.getElementById('sidebar');
            if (sidebar && window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
            }
        });
    });
}

// Filter games based on category and search
function filterGames() {
    const allCards = document.querySelectorAll('.game-card');

    allCards.forEach(card => {
        const title = card.getAttribute('data-title') || '';
        const category = card.getAttribute('data-category') || '';

        const matchesSearch = title.includes(searchQuery);
        const matchesCategory = currentCategory === 'all' || category === '' || category.toLowerCase() === currentCategory.toLowerCase();

        if (matchesSearch && matchesCategory) {
            card.style.display = 'flex';
            // Add highlight effect
            card.style.opacity = '1';
            card.style.transform = '';
        } else {
            card.style.display = 'none';
        }
    });

    // Show "no results" message if nothing found
    const noResults = document.querySelector('.no-results');
    const visibleCards = Array.from(allCards).filter(c => c.style.display !== 'none');

    if (visibleCards.length === 0 && allCards.length > 0) {
        if (!noResults) {
            const msg = document.createElement('div');
            msg.className = 'no-results';
            msg.innerHTML = '<p>No games found matching your criteria.</p>';
            msg.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);';
            document.querySelector('.game-grid').appendChild(msg);
        }
    } else if (noResults) {
        noResults.remove();
    }
}

// Render game grids on index page
function renderGameGrids(gameGrid, newGrid) {
    // Get filtered games
    const filteredGames = getFilteredGames();

    // Show all games in the main grid, and a subset in the newarrivals if on index
    if (gameGrid) {
        gameGrid.innerHTML = filteredGames.map(createGameCard).join('');
    }
    
    if (newGrid) {
        const newArrivals = filteredGames.filter(g => !g.isFeatured).slice(0, 10);
        newGrid.innerHTML = newArrivals.map(createGameCard).join('');
    }

    // Attach favorite toggle listeners
    attachCardListeners();

    // Initialize Lazy Loading for images
    initLazyLoading();

    // Re-initialize search on new cards
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value) {
        setTimeout(() => filterGames(), 100);
    }
}

// Get filtered games based on current state
function getFilteredGames() {
    return gamesDatabase.filter(game => {
        const matchesSearch = searchQuery === '' || game.title.toLowerCase().includes(searchQuery);
        const matchesCategory = currentCategory === 'all' || game.category.toLowerCase() === currentCategory.toLowerCase();
        return matchesSearch && matchesCategory;
    });
}

// Create game card HTML
function createGameCard(game) {
    const isFav = favorites.includes(game.id);
    const thumbContent = game.image 
        ? `<img data-src="${game.image}" alt="${game.title}" class="lazy-load" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=${game.title.charAt(0)}';">`
        : `<span style="font-size: 2.5rem; font-weight: 800; color: rgba(255,255,255,0.8); text-shadow: 0 4px 15px rgba(0,0,0,0.5); font-family: 'Outfit', sans-serif;">${game.title.charAt(0)}</span>`;
    
    const featuredBadge = game.isFeatured ? `<div class="featured-badge">Featured</div>` : '';

    return `
        <div class="game-card" data-id="${game.id}" data-title="${game.title.toLowerCase()}" data-category="${game.category}" title="${game.description || 'Play ' + game.title + ' now!'}">
            <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${game.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 0 0-7.7 7.8l1 1 7.8 7.8 7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>
            </button>
            <a href="game.html?id=${game.id}" class="game-link" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; height: 100%;">
                <div class="game-thumb" style="background: ${game.imageGradient}; display: flex; align-items:center; justify-content:center;">
                    ${thumbContent}
                    ${featuredBadge}
                    <div class="game-tag">${game.category}</div>
                    <div class="play-overlay">
                        <div class="play-btn">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>
                    </div>
                </div>
                <div class="game-info">
                    <h4 class="game-title">${game.title}</h4>
                    <span class="game-category">${game.category}</span>
                </div>
            </a>
        </div>
    `;
}

// Attach listeners to cards (favorites, etc)
function attachCardListeners() {
    document.querySelectorAll('.fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const gameId = btn.getAttribute('data-id');
            toggleFavorite(gameId, btn);
        });
    });
}

// Toggle favorite status
function toggleFavorite(gameId, btn) {
    const index = favorites.indexOf(gameId);
    if (index === -1) {
        favorites.push(gameId);
        btn.classList.add('active');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');
        showNotification('Added to favorites', 'info');
    } else {
        favorites.splice(index, 1);
        btn.classList.remove('active');
        btn.querySelector('svg').setAttribute('fill', 'none');
        showNotification('Removed from favorites', 'info');
    }
    localStorage.setItem('spc_favorites', JSON.stringify(favorites));
}

// Add to recently played
function addToRecent(gameId) {
    // Remove if already exists to move to top
    recentlyPlayed = recentlyPlayed.filter(id => id !== gameId);
    recentlyPlayed.unshift(gameId);
    // Keep only last 10
    if (recentlyPlayed.length > 10) recentlyPlayed.pop();
    localStorage.setItem('spc_recent', JSON.stringify(recentlyPlayed));
}

// Render recently played section
function renderRecentlyPlayed() {
    const section = document.getElementById('recentSection');
    const grid = document.getElementById('recentGrid');
    if (!section || !grid) return;

    if (recentlyPlayed.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    
    grid.innerHTML = recentlyPlayed.map(id => {
        const game = gamesDatabase.find(g => g.id === id);
        if (!game) return '';
        
        const thumb = game.image 
            ? `<img src="${game.image}" alt="${game.title}">`
            : `<div class="placeholder" style="background: ${game.imageGradient}; display: flex; align-items: center; justify-content: center; height: 90px;">
                 <span style="color: white; font-weight: 800;">${game.title.charAt(0)}</span>
               </div>`;
               
        return `
            <a href="game.html?id=${game.id}" class="recent-card">
                ${thumb}
                <div class="recent-info">
                    <div class="recent-title">${game.title}</div>
                </div>
            </a>
        `;
    }).join('');
}

// Game Player initialization
function initGamePlayer() {
    const gameIframe = document.getElementById('gameIframe');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const playerGameTitle = document.getElementById('playerGameTitle');
    const playerGameCategory = document.getElementById('playerGameCategory');
    const relatedGrid = document.getElementById('relatedGrid');
    const btnFullscreen = document.getElementById('btnFullscreen');
    const btnRefresh = document.getElementById('btnRefresh');
    const fullscreenTarget = document.getElementById('fullscreen-target');

    // Parse game ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');
    const game = gamesDatabase.find(g => g.id === gameId) || gamesDatabase[0];

    // Update page title and info
    document.title = `${game.title} | Spc Unblockers`;
    if (playerGameTitle) playerGameTitle.textContent = game.title;
    if (playerGameCategory) playerGameCategory.textContent = game.category;
    updateGameDescription(game);

    // Add to recently played
    addToRecent(game.id);

    // Add loading state handling
    if (gameIframe && loadingOverlay) {
        // Show loading overlay
        loadingOverlay.style.display = 'flex';

        // Set iframe src
        gameIframe.src = game.url;

        // Handle iframe load
        gameIframe.addEventListener('load', () => {
            loadingOverlay.style.display = 'none';
        });

        // Handle iframe error
        gameIframe.addEventListener('error', () => {
            loadingOverlay.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p style="margin-top: 1rem; color: #f43f5e;">Failed to load game</p>
                    <button onclick="document.getElementById('gameIframe').src = '${game.url}'"
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary); border: none; border-radius: 0.5rem; color: white; cursor: pointer;">
                        Try Again
                    </button>
                </div>
            `;
        });

        // Timeout for unresponsive iframes
        setTimeout(() => {
            if (loadingOverlay.style.display !== 'none') {
                loadingOverlay.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <p style="color: var(--text-muted);">Game is taking longer than expected...</p>
                        <button onclick="document.getElementById('gameIframe').src = '${game.url}'"
                                style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary); border: none; border-radius: 0.5rem; color: white; cursor: pointer;">
                            Reload
                        </button>
                    </div>
                `;
            }
        }, 10000);
    }

    // Related games
    if (relatedGrid) {
        const related = gamesDatabase.filter(g => g.id !== game.id && g.category === game.category).slice(0, 5);
        if (related.length > 0) {
            relatedGrid.innerHTML = related.map(createGameCard).join('');
        } else {
            // If no same-category games, show random 5
            const random = gamesDatabase.filter(g => g.id !== game.id).slice(0, 5);
            relatedGrid.innerHTML = random.map(createGameCard).join('');
        }
    }

    // Fullscreen functionality
    if (btnFullscreen && fullscreenTarget) {
        btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                fullscreenTarget.requestFullscreen().catch(err => {
                    console.error(`Fullscreen error: ${err.message}`);
                    showNotification('Fullscreen not available', 'error');
                });
            } else {
                document.exitFullscreen();
            }
        });

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            const isFullscreen = !!document.fullscreenElement;
            btnFullscreen.setAttribute('aria-pressed', isFullscreen);
            btnFullscreen.title = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
        });
    }

    // Refresh functionality
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (gameIframe) {
                gameIframe.src = gameIframe.src;
            }
        });
    }

    // Favorite functionality for player page
    const btnFavorite = document.getElementById('btnFavorite');
    if (btnFavorite && game) {
        const updateFavBtn = () => {
            const isFav = favorites.includes(game.id);
            btnFavorite.classList.toggle('active', isFav);
            btnFavorite.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
            btnFavorite.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
        };

        updateFavBtn();

        btnFavorite.addEventListener('click', () => {
            toggleFavorite(game.id, btnFavorite);
            updateFavBtn();
        });
    }
}

// Show notification toast
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? 'var(--accent)' : 'var(--primary)'};
        color: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    // F for fullscreen on game page
    if (e.key === 'f' && document.getElementById('gameIframe')) {
        const btnFullscreen = document.getElementById('btnFullscreen');
        if (btnFullscreen) btnFullscreen.click();
    }

    // R to refresh game
    if (e.key === 'r' && e.ctrlKey && document.getElementById('gameIframe')) {
        e.preventDefault();
        const btnRefresh = document.getElementById('btnRefresh');
        if (btnRefresh) btnRefresh.click();
    }
});

// Back to top button
function initBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'backToTop';
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>';
    btn.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        border: none;
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transition: var(--transition);
        z-index: 100;
        box-shadow: var(--shadow-glow);
    `;
    document.body.appendChild(btn);

    // Show on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        } else {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
        }
    });

    // Scroll to top on click
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Update game description on player page
function updateGameDescription(game) {
    const descContainer = document.querySelector('.game-description');
    if (descContainer && game?.description) {
        descContainer.textContent = game.description;
    }
}

/* ═══════════════════════════════════════════
   COMMUNITY MODE v2 — PROFILE, REAL P2P CHAT, GROUP CHAT, MULTI-CALL
═══════════════════════════════════════════ */

// ─── STATE ───────────────────────────────────────────────────────────────────
let currentUser = JSON.parse(localStorage.getItem('spc_current_user') || 'null');
// currentUser = { username, password, avatar (base64|null), bio }

let selectedChat = null;
// selectedChat = { type: 'dm'|'group', id: string, name: string, members?: [] }

// PeerJS
let peer = null;
let activeConns = {};      // { peerId: DataConnection }
let activeCall = null;     // outgoing/active MediaConnection (1:1)
let groupCallConns = {};   // { peerId: MediaConnection } for group calls
let localStream = null;

// In-memory chat storage: { chatId: [{ sender, text, time, avatarData }] }
let chatHistory = {};

// Group chats: { groupId: { name, members: [username,...] } }
let groupChats = JSON.parse(localStorage.getItem('spc_groups') || '{}');

// ─── PEER HELPERS ─────────────────────────────────────────────────────────────
function usernameToPeerId(u) { return 'spc2-' + u.toLowerCase().replace(/[^a-z0-9]/g, '-'); }
function peerIdToUsername(id) { return id.replace(/^spc2-/, ''); }
function dmId(a, b) { return [a,b].map(s=>s.toLowerCase()).sort().join('__'); }
function groupId(name) { return 'grp__' + name.toLowerCase().replace(/\s+/g,'-'); }

// ─── AVATAR HELPERS ───────────────────────────────────────────────────────────
function avatarEl(user, size = 38, fontSize = '0.85rem') {
    const av = user && user.avatar;
    if (av) {
        return `<img src="${av}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;" alt="">`;
    }
    const initials = (user && user.username ? user.username : '?').substring(0,2).toUpperCase();
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:${fontSize};flex-shrink:0;">${initials}</div>`;
}

// ─── VIEW SWITCHES ────────────────────────────────────────────────────────────
function showCommunityTab() {
    const gv = document.getElementById('gamesView');
    const cv = document.getElementById('communityView');
    if (gv && cv) {
        gv.style.display = 'none';
        cv.style.display = 'flex';
        window.location.hash = 'community';
        document.querySelectorAll('.nav-item').forEach(i => {
            i.classList.toggle('active', i.textContent.trim() === 'Community');
        });
        renderCommunityPanel();
    }
}
function showGamesTab() {
    const gv = document.getElementById('gamesView');
    const cv = document.getElementById('communityView');
    if (gv && cv) {
        gv.style.display = 'block';
        cv.style.display = 'none';
        if (window.location.hash === '#community') window.location.hash = '';
        document.querySelectorAll('.nav-item').forEach(i => {
            i.classList.toggle('active', i.textContent.trim() === 'Home');
        });
    }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function initCommunityAuth() {
    updateAuthUI();
    if (window.location.hash === '#community') showCommunityTab();
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#community') showCommunityTab();
        else if (window.location.hash === '') showGamesTab();
    });

    // Login ↔ Signup toggle
    const switchLink = document.getElementById('authSwitchLink');
    let isSignUp = false;
    if (switchLink) {
        switchLink.addEventListener('click', e => {
            e.preventDefault();
            isSignUp = !isSignUp;
            document.querySelector('#communityAuth h2').textContent = isSignUp ? 'REGISTER' : 'COMMUNITY';
            document.getElementById('authSubmitBtn').textContent = isSignUp ? 'Create Account' : 'Log In';
            document.getElementById('authSwitchText').textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
            switchLink.textContent = isSignUp ? 'Log In' : 'Sign Up';
            // Show/hide avatar upload on signup
            const avGroup = document.getElementById('authAvatarGroup');
            if (avGroup) avGroup.style.display = isSignUp ? 'block' : 'none';
            document.getElementById('authError').style.display = 'none';
        });
    }

    // Auth form
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', e => {
            e.preventDefault();
            const username = document.getElementById('authUsername').value.trim();
            const password = document.getElementById('authPassword').value;
            if (!username || !password) { showAuthError('Fill in all fields.'); return; }
            if (username.length < 3) { showAuthError('Username min 3 chars.'); return; }
            if (password.length < 5) { showAuthError('Password min 5 chars.'); return; }

            let users = JSON.parse(localStorage.getItem('spc_users') || '[]');
            if (isSignUp) {
                if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
                    showAuthError('Username already taken.'); return;
                }
                // Read avatar if provided
                let avatarData = null;
                const avatarFile = document.getElementById('authAvatarFile');
                if (avatarFile && avatarFile.files[0]) {
                    // We'll read it async then login
                    const reader = new FileReader();
                    reader.onload = ev => {
                        avatarData = ev.target.result;
                        const newUser = { username, password, avatar: avatarData, bio: '' };
                        users.push(newUser);
                        localStorage.setItem('spc_users', JSON.stringify(users));
                        doLogin(newUser);
                    };
                    reader.readAsDataURL(avatarFile.files[0]);
                    return;
                }
                const newUser = { username, password, avatar: null, bio: '' };
                users.push(newUser);
                localStorage.setItem('spc_users', JSON.stringify(users));
                doLogin(newUser);
            } else {
                const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
                if (!user) { showAuthError('Wrong username or password.'); return; }
                doLogin(user);
            }
            document.getElementById('authUsername').value = '';
            document.getElementById('authPassword').value = '';
            document.getElementById('authError').style.display = 'none';
        });
    }

    function showAuthError(msg) {
        const el = document.getElementById('authError');
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }

    function doLogin(user) {
        currentUser = user;
        localStorage.setItem('spc_current_user', JSON.stringify(user));
        updateAuthUI();
        initPeer();
        renderCommunityPanel();
        showNotification(`Welcome, ${user.username}!`, 'success');
    }

    // Header login
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    if (headerLoginBtn) {
        headerLoginBtn.addEventListener('click', () => {
            if (document.getElementById('communityView')) showCommunityTab();
            else window.location.href = 'index.html#community';
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (peer && !peer.destroyed) peer.destroy();
            peer = null; activeConns = {}; activeCall = null; groupCallConns = {};
            if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
            chatHistory = {}; selectedChat = null; currentUser = null;
            localStorage.removeItem('spc_current_user');
            updateAuthUI();
            const cc = document.getElementById('communityChat');
            const ca = document.getElementById('communityAuth');
            if (cc) cc.style.display = 'none';
            if (ca) ca.style.display = 'block';
            showNotification('Logged out', 'info');
        });
    }

    if (currentUser) initPeer();
}

// ─── AUTH UI ──────────────────────────────────────────────────────────────────
function updateAuthUI() {
    const hlb = document.getElementById('headerLoginBtn');
    const ub = document.getElementById('userBar');
    const uw = document.getElementById('userWelcome');
    const headerAvatar = document.getElementById('headerAvatar');
    if (currentUser) {
        if (hlb) hlb.style.display = 'none';
        if (ub) ub.style.display = 'flex';
        if (uw) uw.textContent = currentUser.username;
        if (headerAvatar) headerAvatar.innerHTML = avatarEl(currentUser, 32, '0.7rem');
    } else {
        if (hlb) hlb.style.display = 'inline-flex';
        if (ub) ub.style.display = 'none';
    }
}

// ─── PEERJS ───────────────────────────────────────────────────────────────────
function initPeer() {
    if (!currentUser || (peer && !peer.destroyed)) return;
    setPeerStatus('Connecting...');
    try {
        peer = new Peer(usernameToPeerId(currentUser.username), { debug: 0 });
    } catch(e) { setPeerStatus('Unavailable'); return; }

    peer.on('open', () => setPeerStatus('● Online'));
    peer.on('error', err => {
        if (err.type === 'unavailable-id') setPeerStatus('● Online (multi-tab)');
        else setPeerStatus('Connection error');
    });
    peer.on('disconnected', () => { setPeerStatus('Reconnecting...'); peer.reconnect(); });

    // Incoming data (chat message, group invite, group message)
    peer.on('connection', conn => handleIncomingConn(conn));

    // Incoming voice call
    peer.on('call', call => {
        const callerName = peerIdToUsername(call.peer);
        // Check if group call
        if (call.metadata && call.metadata.groupId) {
            handleIncomingGroupCall(call, callerName);
        } else {
            showIncomingCallUI(callerName, call);
        }
    });
}

function setPeerStatus(txt) {
    const el = document.getElementById('peerStatusIndicator');
    if (el) {
        el.textContent = txt;
        el.style.color = txt.includes('Online') ? '#22c55e' : 'var(--text-muted)';
    }
}

// ─── DATA CONNECTION HANDLER ──────────────────────────────────────────────────
function handleIncomingConn(conn) {
    conn.on('open', () => {
        const uname = peerIdToUsername(conn.peer);
        activeConns[conn.peer] = conn;

        // Announce our profile
        conn.send({ type: 'profile', username: currentUser.username, avatar: currentUser.avatar, bio: currentUser.bio });

        // Ensure DM chat tab exists
        const cid = dmId(currentUser.username, uname);
        if (!chatHistory[cid]) chatHistory[cid] = [];
        addChatTab({ type: 'dm', id: cid, name: uname });
    });

    conn.on('data', data => handleIncomingData(conn, data));
    conn.on('close', () => {
        const uname = peerIdToUsername(conn.peer);
        delete activeConns[conn.peer];
        refreshChatList();
        if (selectedChat && selectedChat.id === dmId(currentUser.username, uname)) {
            appendSystemMsg('User disconnected.');
        }
    });
}

function handleIncomingData(conn, data) {
    const senderName = peerIdToUsername(conn.peer);
    switch (data.type) {
        case 'profile':
            // Update stored avatar for this user
            storeRemoteProfile(data.username, data.avatar, data.bio);
            break;
        case 'message': {
            const cid = dmId(currentUser.username, senderName);
            if (!chatHistory[cid]) chatHistory[cid] = [];
            const msg = { sender: senderName, text: escapeHTML(data.text), time: now(), avatarData: data.avatarData };
            chatHistory[cid].push(msg);
            if (selectedChat && selectedChat.id === cid) renderMessages();
            else { flashTab(cid); showNotification(`💬 ${senderName}: ${data.text.substring(0,40)}`, 'info'); }
            refreshChatList();
            break;
        }
        case 'group_message': {
            const gid = data.groupId;
            if (!chatHistory[gid]) chatHistory[gid] = [];
            const msg = { sender: senderName, text: escapeHTML(data.text), time: now(), avatarData: data.avatarData };
            chatHistory[gid].push(msg);
            if (selectedChat && selectedChat.id === gid) renderMessages();
            else { flashTab(gid); showNotification(`👥 ${senderName} (${data.groupName}): ${data.text.substring(0,35)}`, 'info'); }
            refreshChatList();
            break;
        }
        case 'group_invite': {
            // Someone added us to a group
            if (!groupChats[data.groupId]) {
                groupChats[data.groupId] = { name: data.groupName, members: data.members };
                localStorage.setItem('spc_groups', JSON.stringify(groupChats));
                if (!chatHistory[data.groupId]) chatHistory[data.groupId] = [];
                addChatTab({ type: 'group', id: data.groupId, name: data.groupName, members: data.members });
                showNotification(`👥 You were added to "${data.groupName}"`, 'success');
            }
            break;
        }
        case 'group_call_invite': {
            showIncomingGroupCallInvite(data, senderName);
            break;
        }
    }
}

// Store remote user profiles so their avatar shows in chat
function storeRemoteProfile(username, avatar, bio) {
    let remotes = JSON.parse(localStorage.getItem('spc_remote_profiles') || '{}');
    remotes[username.toLowerCase()] = { avatar, bio };
    localStorage.setItem('spc_remote_profiles', JSON.stringify(remotes));
}
function getRemoteProfile(username) {
    let remotes = JSON.parse(localStorage.getItem('spc_remote_profiles') || '{}');
    return remotes[username.toLowerCase()] || null;
}
function getAvatarFor(username) {
    if (currentUser && username.toLowerCase() === currentUser.username.toLowerCase()) return currentUser.avatar;
    const r = getRemoteProfile(username);
    return r ? r.avatar : null;
}

// ─── COMMUNITY PANEL ──────────────────────────────────────────────────────────
function renderCommunityPanel() {
    const ca = document.getElementById('communityAuth');
    const cc = document.getElementById('communityChat');
    if (!ca || !cc) return;
    if (!currentUser) {
        ca.style.display = 'block'; cc.style.display = 'none';
    } else {
        ca.style.display = 'none'; cc.style.display = 'block';
        renderMyProfileCard();
        refreshChatList();
        bindChatHandlers();
        bindCallHandlers();
    }
}

// ─── MY PROFILE CARD (left sidebar top) ───────────────────────────────────────
function renderMyProfileCard() {
    const el = document.getElementById('myProfileCard');
    if (!el || !currentUser) return;
    el.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem;border-bottom:1px solid var(--border);">
            <div style="position:relative;cursor:pointer;" id="profileAvatarClick" title="Change avatar">
                ${avatarEl(currentUser, 42, '1rem')}
                <div style="position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:0.2s;" class="avatar-hover-overlay">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <input type="file" id="avatarUploadInput" accept="image/*" style="display:none;">
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.95rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(currentUser.username)}</div>
                <div style="font-size:0.75rem;color:#22c55e;font-weight:600;">● Online</div>
            </div>
            <button id="btnEditProfile" title="Edit profile" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;border-radius:6px;transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
        </div>
    `;

    // Avatar hover effect
    const profileAvClick = document.getElementById('profileAvatarClick');
    const avatarHover = el.querySelector('.avatar-hover-overlay');
    if (profileAvClick) {
        profileAvClick.addEventListener('mouseenter', () => avatarHover.style.opacity = '1');
        profileAvClick.addEventListener('mouseleave', () => avatarHover.style.opacity = '0');
        profileAvClick.addEventListener('click', () => document.getElementById('avatarUploadInput').click());
    }

    // Avatar file upload
    const avatarInput = document.getElementById('avatarUploadInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                currentUser.avatar = ev.target.result;
                // Save back to users array
                let users = JSON.parse(localStorage.getItem('spc_users') || '[]');
                const idx = users.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
                if (idx >= 0) users[idx].avatar = currentUser.avatar;
                localStorage.setItem('spc_users', JSON.stringify(users));
                localStorage.setItem('spc_current_user', JSON.stringify(currentUser));
                updateAuthUI();
                renderMyProfileCard();
                // Broadcast new avatar to all open connections
                Object.values(activeConns).forEach(c => {
                    if (c.open) c.send({ type: 'profile', username: currentUser.username, avatar: currentUser.avatar, bio: currentUser.bio });
                });
                showNotification('Profile picture updated!', 'success');
            };
            reader.readAsDataURL(file);
        });
    }

    // Edit profile modal
    const btnEdit = document.getElementById('btnEditProfile');
    if (btnEdit) btnEdit.addEventListener('click', showEditProfileModal);
}

function showEditProfileModal() {
    let modal = document.getElementById('editProfileModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'editProfileModal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);z-index:2000;display:flex;align-items:center;justify-content:center;`;
    modal.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:2rem;width:360px;max-width:95vw;">
            <h3 style="font-family:'Orbitron',sans-serif;font-size:1.1rem;margin-bottom:1.5rem;color:var(--text-main);letter-spacing:1px;">EDIT PROFILE</h3>
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div style="text-align:center;">
                    <div style="display:inline-block;position:relative;cursor:pointer;" id="modalAvatarClick">
                        ${avatarEl(currentUser, 72, '1.5rem')}
                        <div style="position:absolute;bottom:0;right:0;width:22px;height:22px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg-card);">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </div>
                        <input type="file" id="modalAvatarFile" accept="image/*" style="display:none;">
                    </div>
                    <p style="color:var(--text-muted);font-size:0.78rem;margin-top:0.5rem;">Click to change photo</p>
                </div>
                <div>
                    <label style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.4rem;display:block;">Username</label>
                    <input id="editUsername" type="text" value="${escapeHTML(currentUser.username)}" style="width:100%;padding:0.65rem 1rem;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:var(--radius-md);color:white;outline:none;">
                </div>
                <div>
                    <label style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.4rem;display:block;">Bio</label>
                    <textarea id="editBio" rows="2" placeholder="What are you playing?" style="width:100%;padding:0.65rem 1rem;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:var(--radius-md);color:white;outline:none;resize:none;font-family:inherit;">${escapeHTML(currentUser.bio||'')}</textarea>
                </div>
                <div id="editProfileError" style="color:var(--accent);font-size:0.85rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;margin-top:0.5rem;">
                    <button id="btnCancelEdit" class="btn btn-secondary" style="flex:1;justify-content:center;">Cancel</button>
                    <button id="btnSaveProfile" class="btn btn-primary" style="flex:1;justify-content:center;">Save</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let newAvatarData = currentUser.avatar;

    document.getElementById('modalAvatarClick').addEventListener('click', () => document.getElementById('modalAvatarFile').click());
    document.getElementById('modalAvatarFile').addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            newAvatarData = ev.target.result;
            document.querySelector('#modalAvatarClick > div:first-child').outerHTML = avatarEl({ avatar: newAvatarData, username: currentUser.username }, 72, '1.5rem');
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('btnCancelEdit').addEventListener('click', () => modal.remove());
    document.getElementById('btnSaveProfile').addEventListener('click', () => {
        const newUsername = document.getElementById('editUsername').value.trim();
        const newBio = document.getElementById('editBio').value.trim();
        if (newUsername.length < 3) { document.getElementById('editProfileError').textContent = 'Username min 3 chars.'; document.getElementById('editProfileError').style.display = 'block'; return; }
        // Check uniqueness if changed
        if (newUsername.toLowerCase() !== currentUser.username.toLowerCase()) {
            let users = JSON.parse(localStorage.getItem('spc_users') || '[]');
            if (users.find(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
                document.getElementById('editProfileError').textContent = 'Username taken.'; document.getElementById('editProfileError').style.display = 'block'; return;
            }
        }
        // Update
        currentUser.avatar = newAvatarData;
        currentUser.username = newUsername;
        currentUser.bio = newBio;
        let users = JSON.parse(localStorage.getItem('spc_users') || '[]');
        const idx = users.findIndex(u => u.username.toLowerCase() === newUsername.toLowerCase() || u.password === currentUser.password);
        if (idx >= 0) users[idx] = { ...users[idx], username: newUsername, avatar: newAvatarData, bio: newBio };
        localStorage.setItem('spc_users', JSON.stringify(users));
        localStorage.setItem('spc_current_user', JSON.stringify(currentUser));
        updateAuthUI();
        renderMyProfileCard();
        Object.values(activeConns).forEach(c => { if (c.open) c.send({ type: 'profile', username: newUsername, avatar: newAvatarData, bio: newBio }); });
        modal.remove();
        showNotification('Profile saved!', 'success');
    });
}

// ─── CHAT LIST (LEFT SIDEBAR) ─────────────────────────────────────────────────
function addChatTab(chat) {
    // chat = { type, id, name, members? }
    const list = document.getElementById('activeChatsList');
    if (!list) return;
    if (!chatHistory[chat.id]) chatHistory[chat.id] = [];
    refreshChatList();
}

function refreshChatList() {
    const list = document.getElementById('activeChatsList');
    if (!list) return;
    const allChats = getAllChats();
    if (allChats.length === 0) {
        list.innerHTML = `<div style="padding:1.2rem 1rem;color:var(--text-muted);font-size:0.82rem;text-align:center;line-height:1.6;">No chats yet.<br>Type a username above to start,<br>or create a group chat.</div>`;
        return;
    }
    list.innerHTML = allChats.map(chat => {
        const msgs = chatHistory[chat.id] || [];
        const last = msgs[msgs.length - 1];
        const isActive = selectedChat && selectedChat.id === chat.id;
        const isConnected = chat.type === 'dm' ? !!activeConns[usernameToPeerId(chat.name)] : true;
        const dotColor = isConnected ? '#22c55e' : 'var(--text-muted)';
        const avatarUser = chat.type === 'dm' ? { username: chat.name, avatar: getAvatarFor(chat.name) } : null;

        return `
            <div class="online-user-item ${isActive ? 'active' : ''}" data-chatid="${chat.id}" id="chattab-${chat.id}" style="cursor:pointer;gap:0.6rem;">
                <div style="position:relative;flex-shrink:0;">
                    ${chat.type === 'group'
                        ? `<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#f43f5e,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:1rem;">👥</div>`
                        : avatarEl(avatarUser, 38, '0.8rem')
                    }
                    <span style="position:absolute;bottom:0;right:0;width:9px;height:9px;border-radius:50%;background:${dotColor};border:2px solid var(--bg-sidebar);"></span>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.9rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(chat.name)}</div>
                    <div style="font-size:0.73rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${last ? (last.sender === currentUser.username ? 'You: ' : '') + last.text.substring(0,28) : (chat.type === 'group' ? 'Group chat' : 'Click to chat')}</div>
                </div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.online-user-item').forEach(item => {
        item.addEventListener('click', () => {
            const cid = item.getAttribute('data-chatid');
            const chat = allChats.find(c => c.id === cid);
            if (chat) openChat(chat);
        });
    });
}

function getAllChats() {
    // Combine DM chats and group chats
    const dms = Object.keys(chatHistory)
        .filter(id => !id.startsWith('grp__'))
        .map(id => {
            // Determine the other username from the DM id
            const parts = id.split('__');
            const otherName = parts.find(p => p.toLowerCase() !== currentUser.username.toLowerCase()) || id;
            return { type: 'dm', id, name: otherName };
        });
    const groups = Object.entries(groupChats).map(([gid, g]) => ({
        type: 'group', id: gid, name: g.name, members: g.members
    }));
    return [...dms, ...groups];
}

function flashTab(chatId) {
    const tab = document.getElementById('chattab-' + chatId);
    if (tab) { tab.style.background = 'rgba(139,92,246,0.25)'; setTimeout(() => { tab.style.background = ''; }, 1800); }
}

// ─── OPEN CHAT ────────────────────────────────────────────────────────────────
function openChat(chat) {
    selectedChat = chat;
    document.getElementById('chatEmptyState').style.display = 'none';
    document.getElementById('chatActiveState').style.display = 'flex';

    // Header
    const avatarUser = chat.type === 'dm' ? { username: chat.name, avatar: getAvatarFor(chat.name) } : null;
    document.getElementById('activeChatAvatarWrap').innerHTML = chat.type === 'group'
        ? `<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#f43f5e,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">👥</div>`
        : avatarEl(avatarUser, 42, '1rem');
    document.getElementById('activeUserName').textContent = chat.name;
    document.getElementById('activeUserActivity').textContent = chat.type === 'group'
        ? `${(chat.members||[]).length} members`
        : (activeConns[usernameToPeerId(chat.name)] ? '● Connected' : '○ Not connected');

    // Show/hide call button for DMs only; show group call for groups
    const btnCall = document.getElementById('btnCallUser');
    const btnGroupCall = document.getElementById('btnGroupCallUser');
    if (btnCall) btnCall.style.display = chat.type === 'dm' ? 'inline-flex' : 'none';
    if (btnGroupCall) btnGroupCall.style.display = chat.type === 'group' ? 'inline-flex' : 'none';

    refreshChatList();
    renderMessages();
}

// ─── RENDER MESSAGES ──────────────────────────────────────────────────────────
function renderMessages() {
    const box = document.getElementById('chatMessages');
    if (!box || !selectedChat) return;
    const history = chatHistory[selectedChat.id] || [];
    if (history.length === 0) {
        box.innerHTML = `<div style="display:flex;flex:1;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.9rem;text-align:center;padding:2rem;">Start the conversation!<br><span style="font-size:1.5rem;margin-top:0.5rem;display:block;">👋</span></div>`;
        return;
    }
    box.innerHTML = history.map(msg => {
        if (msg.sender === 'System') return `<div style="text-align:center;color:var(--text-muted);font-size:0.78rem;padding:0.4rem;">${msg.text}</div>`;
        const isSent = msg.sender.toLowerCase() === currentUser.username.toLowerCase();
        const msgAvatar = { username: msg.sender, avatar: msg.avatarData || getAvatarFor(msg.sender) };
        return `
            <div style="display:flex;align-items:flex-end;gap:0.5rem;${isSent ? 'flex-direction:row-reverse;' : ''}">
                <div style="flex-shrink:0;">${avatarEl(msgAvatar, 26, '0.6rem')}</div>
                <div class="chat-bubble ${isSent ? 'sent' : 'received'}" style="max-width:60%;">
                    ${selectedChat.type === 'group' && !isSent ? `<div style="font-weight:700;font-size:0.72rem;color:var(--primary);margin-bottom:0.15rem;">${escapeHTML(msg.sender)}</div>` : ''}
                    <div>${msg.text}</div>
                    <span class="timestamp">${msg.time}</span>
                </div>
            </div>
        `;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

function appendSystemMsg(text) {
    if (selectedChat) {
        if (!chatHistory[selectedChat.id]) chatHistory[selectedChat.id] = [];
        chatHistory[selectedChat.id].push({ sender: 'System', text, time: now() });
        renderMessages();
    }
}

// ─── BIND CHAT HANDLERS ───────────────────────────────────────────────────────
function bindChatHandlers() {
    // Start DM
    const btnStart = document.getElementById('btnStartChat');
    if (btnStart && !btnStart._bound) {
        btnStart._bound = true;
        const doStart = () => {
            const input = document.getElementById('peerUsernameInput');
            const target = input.value.trim();
            if (!target) return;
            if (target.toLowerCase() === currentUser.username.toLowerCase()) { showNotification("Can't chat with yourself", 'error'); return; }
            input.value = '';
            const statusEl = document.getElementById('peerConnectStatus');
            statusEl.textContent = 'Connecting...';
            const targetPeerId = usernameToPeerId(target);
            if (!peer || peer.destroyed) { statusEl.textContent = 'Not online. Refresh page.'; return; }
            const conn = peer.connect(targetPeerId, { reliable: true, metadata: { username: currentUser.username } });
            conn.on('open', () => {
                activeConns[targetPeerId] = conn;
                conn.send({ type: 'profile', username: currentUser.username, avatar: currentUser.avatar, bio: currentUser.bio });
                const cid = dmId(currentUser.username, target);
                if (!chatHistory[cid]) chatHistory[cid] = [];
                addChatTab({ type: 'dm', id: cid, name: target });
                openChat({ type: 'dm', id: cid, name: target });
                statusEl.textContent = `Connected to ${target}`;
                setTimeout(() => statusEl.textContent = '', 3000);
            });
            conn.on('data', data => handleIncomingData(conn, data));
            conn.on('close', () => { delete activeConns[targetPeerId]; refreshChatList(); appendSystemMsg(`${target} disconnected.`); });
            conn.on('error', () => { statusEl.textContent = `${target} is not online`; setTimeout(() => statusEl.textContent = '', 4000); });
        };
        btnStart.addEventListener('click', doStart);
        document.getElementById('peerUsernameInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doStart(); } });
    }

    // Create group
    const btnCreateGroup = document.getElementById('btnCreateGroup');
    if (btnCreateGroup && !btnCreateGroup._bound) {
        btnCreateGroup._bound = true;
        btnCreateGroup.addEventListener('click', showCreateGroupModal);
    }

    // Send message
    const chatForm = document.getElementById('chatForm');
    if (chatForm && !chatForm._bound) {
        chatForm._bound = true;
        chatForm.addEventListener('submit', e => {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (!text || !selectedChat) return;
            const msg = { sender: currentUser.username, text: escapeHTML(text), time: now(), avatarData: currentUser.avatar };
            if (!chatHistory[selectedChat.id]) chatHistory[selectedChat.id] = [];
            chatHistory[selectedChat.id].push(msg);
            renderMessages();
            refreshChatList();
            input.value = '';
            // Send over P2P
            if (selectedChat.type === 'dm') {
                const conn = activeConns[usernameToPeerId(selectedChat.name)];
                if (conn && conn.open) conn.send({ type: 'message', text, avatarData: currentUser.avatar });
                else appendSystemMsg('⚠ Not connected — message saved locally only.');
            } else {
                // Group: broadcast to all members who are connected
                const group = groupChats[selectedChat.id];
                if (group) {
                    group.members.filter(m => m.toLowerCase() !== currentUser.username.toLowerCase()).forEach(m => {
                        const conn = activeConns[usernameToPeerId(m)];
                        if (conn && conn.open) conn.send({ type: 'group_message', groupId: selectedChat.id, groupName: selectedChat.name, text, avatarData: currentUser.avatar });
                    });
                }
            }
        });
    }
}

// ─── GROUP CHAT ───────────────────────────────────────────────────────────────
function showCreateGroupModal() {
    let modal = document.getElementById('createGroupModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'createGroupModal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);z-index:2000;display:flex;align-items:center;justify-content:center;`;
    modal.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:2rem;width:380px;max-width:95vw;">
            <h3 style="font-family:'Orbitron',sans-serif;font-size:1.05rem;margin-bottom:1.5rem;color:var(--text-main);letter-spacing:1px;">CREATE GROUP CHAT</h3>
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div>
                    <label style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.4rem;display:block;">Group Name</label>
                    <input id="groupNameInput" type="text" placeholder="e.g. Slope Squad" maxlength="30" style="width:100%;padding:0.65rem 1rem;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:var(--radius-md);color:white;outline:none;">
                </div>
                <div>
                    <label style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.4rem;display:block;">Add Members (usernames, comma-separated)</label>
                    <input id="groupMembersInput" type="text" placeholder="e.g. alex, jordan, sam" style="width:100%;padding:0.65rem 1rem;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:var(--radius-md);color:white;outline:none;">
                </div>
                <div id="createGroupError" style="color:var(--accent);font-size:0.85rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;margin-top:0.5rem;">
                    <button id="btnCancelGroup" class="btn btn-secondary" style="flex:1;justify-content:center;">Cancel</button>
                    <button id="btnConfirmGroup" class="btn btn-primary" style="flex:1;justify-content:center;">Create</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btnCancelGroup').addEventListener('click', () => modal.remove());
    document.getElementById('btnConfirmGroup').addEventListener('click', () => {
        const name = document.getElementById('groupNameInput').value.trim();
        const membersRaw = document.getElementById('groupMembersInput').value.trim();
        if (!name) { document.getElementById('createGroupError').textContent = 'Enter a group name.'; document.getElementById('createGroupError').style.display = 'block'; return; }
        const members = [currentUser.username, ...membersRaw.split(',').map(m => m.trim()).filter(m => m && m.toLowerCase() !== currentUser.username.toLowerCase())];
        const gid = groupId(name) + '-' + Date.now();
        groupChats[gid] = { name, members };
        localStorage.setItem('spc_groups', JSON.stringify(groupChats));
        if (!chatHistory[gid]) chatHistory[gid] = [];
        // Invite all members via P2P
        members.filter(m => m.toLowerCase() !== currentUser.username.toLowerCase()).forEach(m => {
            const conn = activeConns[usernameToPeerId(m)];
            if (conn && conn.open) {
                conn.send({ type: 'group_invite', groupId: gid, groupName: name, members });
            } else {
                // Try to connect first
                if (peer && !peer.destroyed) {
                    const c = peer.connect(usernameToPeerId(m), { reliable: true });
                    c.on('open', () => {
                        activeConns[usernameToPeerId(m)] = c;
                        c.send({ type: 'profile', username: currentUser.username, avatar: currentUser.avatar, bio: currentUser.bio });
                        c.send({ type: 'group_invite', groupId: gid, groupName: name, members });
                        c.on('data', data => handleIncomingData(c, data));
                    });
                }
            }
        });
        addChatTab({ type: 'group', id: gid, name, members });
        openChat({ type: 'group', id: gid, name, members });
        modal.remove();
        showNotification(`Group "${name}" created!`, 'success');
    });
}

// ─── VOICE CALL (1:1) ─────────────────────────────────────────────────────────
let callDurationSeconds = 0;
let callTimerInterval = null;

function bindCallHandlers() {
    // 1:1 Call
    const btnCall = document.getElementById('btnCallUser');
    if (btnCall && !btnCall._bound) {
        btnCall._bound = true;
        btnCall.addEventListener('click', async () => {
            if (!selectedChat || selectedChat.type !== 'dm') return;
            if (!peer || peer.destroyed) { showNotification('Not connected', 'error'); return; }
            const overlay = document.getElementById('callOverlay');
            const targetName = selectedChat.name;
            // Show UI
            overlay.style.display = 'flex';
            document.getElementById('callUserName').textContent = targetName;
            const callAvatarWrap = document.getElementById('callAvatarWrap');
            if (callAvatarWrap) callAvatarWrap.innerHTML = avatarEl({ username: targetName, avatar: getAvatarFor(targetName) }, 120, '2.8rem');
            setCallStatus('ringing');
            document.getElementById('callVisualizer').style.display = 'none';
            callDurationSeconds = 0;
            document.getElementById('btnCallMute').classList.remove('active');
            document.getElementById('btnCallMute').style.background = 'rgba(255,255,255,0.08)';
            // Get mic
            try { localStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
            catch { overlay.style.display = 'none'; showNotification('Mic permission denied', 'error'); return; }
            playSyntheticRing();
            const call = peer.call(usernameToPeerId(targetName), localStream);
            activeCall = call;
            call.on('stream', remoteStream => {
                stopSyntheticRing(); playConnectChime();
                setCallStatus('connected');
                document.getElementById('callVisualizer').style.display = 'flex';
                const audio = document.getElementById('remoteAudio');
                if (audio) { audio.srcObject = remoteStream; audio.play().catch(()=>{}); }
                startCallTimer();
            });
            call.on('close', () => hangUpCall('Call ended'));
            call.on('error', () => { stopSyntheticRing(); overlay.style.display = 'none'; showNotification(`${targetName} unavailable`, 'error'); cleanupLocalStream(); });
            setTimeout(() => {
                if (document.getElementById('callStatus').dataset.state === 'ringing') hangUpCall('No answer');
            }, 25000);
        });
    }

    // Group Call
    const btnGroupCall = document.getElementById('btnGroupCallUser');
    if (btnGroupCall && !btnGroupCall._bound) {
        btnGroupCall._bound = true;
        btnGroupCall.addEventListener('click', startGroupCall);
    }

    // Hang up
    const hangUpBtn = document.getElementById('btnCallDecline');
    if (hangUpBtn && !hangUpBtn._bound) {
        hangUpBtn._bound = true;
        hangUpBtn.addEventListener('click', () => hangUpCall('Call ended'));
    }

    // Mute
    const muteBtn = document.getElementById('btnCallMute');
    if (muteBtn && !muteBtn._bound) {
        muteBtn._bound = true;
        muteBtn.addEventListener('click', () => {
            muteBtn.classList.toggle('active');
            if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = !muteBtn.classList.contains('active'); });
            muteBtn.style.background = muteBtn.classList.contains('active') ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.08)';
            showNotification(muteBtn.classList.contains('active') ? 'Muted' : 'Unmuted', 'info');
        });
    }

    // Accept / Decline incoming
    const acceptBtn = document.getElementById('btnAcceptCall');
    if (acceptBtn && !acceptBtn._boundAccept) {
        acceptBtn._boundAccept = true;
        acceptBtn.addEventListener('click', () => window._pendingCallAccept && window._pendingCallAccept());
    }
    const declineBtn = document.getElementById('btnDeclineCall');
    if (declineBtn && !declineBtn._boundDecline) {
        declineBtn._boundDecline = true;
        declineBtn.addEventListener('click', () => window._pendingCallDecline && window._pendingCallDecline());
    }
}

function setCallStatus(state) {
    const el = document.getElementById('callStatus');
    if (!el) return;
    el.dataset.state = state;
    el.innerHTML = state === 'ringing'
        ? `<span style="display:inline-flex;align-items:center;gap:0.5rem;"><span style="display:inline-block;width:8px;height:8px;background:#eab308;border-radius:50%;"></span>Ringing...</span>`
        : `<span style="display:inline-flex;align-items:center;gap:0.5rem;"><span style="display:inline-block;width:8px;height:8px;background:#22c55e;border-radius:50%;"></span><span id="callDuration">Connected (00:00)</span></span>`;
}

function startCallTimer() {
    callDurationSeconds = 0;
    if (callTimerInterval) clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
        callDurationSeconds++;
        const m = String(Math.floor(callDurationSeconds/60)).padStart(2,'0');
        const s = String(callDurationSeconds%60).padStart(2,'0');
        const el = document.getElementById('callDuration');
        if (el) el.textContent = `Connected (${m}:${s})`;
    }, 1000);
}

function showIncomingCallUI(callerName, call) {
    const overlay = document.getElementById('incomingCallOverlay');
    if (!overlay) return;
    document.getElementById('incomingCallName').textContent = callerName;
    const inAvWrap = document.getElementById('incomingCallAvatarWrap');
    if (inAvWrap) inAvWrap.innerHTML = avatarEl({ username: callerName, avatar: getAvatarFor(callerName) }, 120, '2.8rem');
    overlay.style.display = 'flex';
    playSyntheticRing();

    window._pendingCallAccept = async () => {
        stopSyntheticRing();
        overlay.style.display = 'none';
        window._pendingCallAccept = null; window._pendingCallDecline = null;
        try { localStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
        catch { showNotification('Mic denied', 'error'); return; }
        call.answer(localStream);
        activeCall = call;
        const callOverlay = document.getElementById('callOverlay');
        callOverlay.style.display = 'flex';
        document.getElementById('callUserName').textContent = callerName;
        const callAvatarWrap = document.getElementById('callAvatarWrap');
        if (callAvatarWrap) callAvatarWrap.innerHTML = avatarEl({ username: callerName, avatar: getAvatarFor(callerName) }, 120, '2.8rem');
        setCallStatus('connected');
        document.getElementById('callVisualizer').style.display = 'flex';
        playConnectChime();
        startCallTimer();
        call.on('stream', remoteStream => {
            const audio = document.getElementById('remoteAudio');
            if (audio) { audio.srcObject = remoteStream; audio.play().catch(()=>{}); }
        });
        call.on('close', () => hangUpCall('Call ended'));
    };
    window._pendingCallDecline = () => {
        stopSyntheticRing();
        overlay.style.display = 'none';
        call.close();
        window._pendingCallAccept = null; window._pendingCallDecline = null;
    };
}

function hangUpCall(logStatus) {
    stopSyntheticRing();
    if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    if (activeCall) { try { activeCall.close(); } catch(e){} activeCall = null; }
    // Also close all group call conns
    Object.values(groupCallConns).forEach(c => { try { c.close(); } catch(e){} });
    groupCallConns = {};
    cleanupLocalStream();
    const audio = document.getElementById('remoteAudio');
    if (audio) { audio.srcObject = null; }
    const overlay = document.getElementById('callOverlay');
    const groupCallOverlay = document.getElementById('groupCallOverlay');
    if (overlay) overlay.style.display = 'none';
    if (groupCallOverlay) groupCallOverlay.style.display = 'none';
    playDisconnectBeep();
    if (selectedChat) {
        const m = String(Math.floor(callDurationSeconds/60)).padStart(2,'0');
        const s = String(callDurationSeconds%60).padStart(2,'0');
        appendSystemMsg(`📞 Voice Call — ${logStatus} (${m}:${s})`);
    }
}

function cleanupLocalStream() {
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
}

// ─── GROUP VOICE CALL ─────────────────────────────────────────────────────────
// Group call works as a mesh: we call every other member simultaneously
// Each connection's audio gets mixed by the browser automatically via separate <audio> elements

async function startGroupCall() {
    if (!selectedChat || selectedChat.type !== 'group') return;
    const group = groupChats[selectedChat.id];
    if (!group) return;
    const otherMembers = group.members.filter(m => m.toLowerCase() !== currentUser.username.toLowerCase());
    if (otherMembers.length === 0) { showNotification('No other members in group', 'info'); return; }

    try { localStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { showNotification('Mic permission denied', 'error'); return; }

    // Show group call overlay
    showGroupCallOverlay(group.name, group.members);

    // Call each member
    otherMembers.forEach(member => {
        const memberPeerId = usernameToPeerId(member);
        // First ensure data connection for invite
        const dataConn = activeConns[memberPeerId];
        if (dataConn && dataConn.open) {
            dataConn.send({ type: 'group_call_invite', groupId: selectedChat.id, groupName: group.name, callerName: currentUser.username });
        }
        // Place audio call
        const call = peer.call(memberPeerId, localStream, { metadata: { groupId: selectedChat.id, groupName: group.name } });
        groupCallConns[memberPeerId] = call;
        call.on('stream', remoteStream => {
            addGroupCallAudioStream(member, remoteStream);
            updateGroupCallParticipants(group.name, group.members);
        });
        call.on('close', () => {
            removeGroupCallAudio(member);
            delete groupCallConns[memberPeerId];
        });
    });
}

function handleIncomingGroupCall(call, callerName) {
    const groupId = call.metadata.groupId;
    const groupName = call.metadata.groupName;
    // Show incoming group call UI
    const overlay = document.getElementById('incomingCallOverlay');
    if (overlay) {
        document.getElementById('incomingCallName').textContent = `${callerName} → ${groupName}`;
        const inAvWrap = document.getElementById('incomingCallAvatarWrap');
        if (inAvWrap) inAvWrap.innerHTML = `<div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#f43f5e,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:3rem;">👥</div>`;
        overlay.style.display = 'flex';
        playSyntheticRing();
    }

    window._pendingCallAccept = async () => {
        stopSyntheticRing();
        if (overlay) overlay.style.display = 'none';
        window._pendingCallAccept = null; window._pendingCallDecline = null;
        try { localStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
        catch { showNotification('Mic denied', 'error'); return; }
        call.answer(localStream);
        groupCallConns[call.peer] = call;
        const group = groupChats[groupId];
        showGroupCallOverlay(groupName, group ? group.members : [callerName, currentUser.username]);
        call.on('stream', remoteStream => { addGroupCallAudioStream(callerName, remoteStream); });
        call.on('close', () => { removeGroupCallAudio(callerName); delete groupCallConns[call.peer]; });
        playConnectChime();
    };

    window._pendingCallDecline = () => {
        stopSyntheticRing();
        if (overlay) overlay.style.display = 'none';
        call.close();
        window._pendingCallAccept = null; window._pendingCallDecline = null;
    };
}

function showIncomingGroupCallInvite(data, senderName) {
    // Already handled by the peer.on('call') for mesh calls
    // Just show a notification if they haven't called us yet
    showNotification(`📞 ${senderName} started a call in "${data.groupName}"`, 'info');
}

function showGroupCallOverlay(groupName, members) {
    let overlay = document.getElementById('groupCallOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'groupCallOverlay';
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(10,10,15,0.96);backdrop-filter:blur(20px);z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;`;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    updateGroupCallParticipants(groupName, members);
}

function updateGroupCallParticipants(groupName, members) {
    const overlay = document.getElementById('groupCallOverlay');
    if (!overlay) return;
    const participantAvatars = members.map(m => {
        const isMe = m.toLowerCase() === currentUser.username.toLowerCase();
        const avUser = { username: m, avatar: isMe ? currentUser.avatar : getAvatarFor(m) };
        const connected = isMe || !!groupCallConns[usernameToPeerId(m)];
        return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;">
                <div style="position:relative;">
                    ${avatarEl(avUser, 70, '1.4rem')}
                    <span style="position:absolute;bottom:2px;right:2px;width:12px;height:12px;border-radius:50%;background:${connected ? '#22c55e' : '#94a3b8'};border:2px solid rgba(10,10,15,0.96);"></span>
                </div>
                <span style="font-size:0.78rem;color:${connected ? 'var(--text-main)' : 'var(--text-muted)'};">${escapeHTML(m)}${isMe ? ' (You)' : ''}</span>
            </div>
        `;
    }).join('');

    overlay.innerHTML = `
        <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:2rem;">
            <div>
                <div style="font-size:0.9rem;color:var(--text-muted);letter-spacing:2px;font-family:'Orbitron',sans-serif;margin-bottom:0.5rem;">GROUP CALL</div>
                <h2 style="font-family:'Orbitron',sans-serif;font-size:1.8rem;letter-spacing:1px;">${escapeHTML(groupName)}</h2>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:1.5rem;justify-content:center;max-width:500px;">${participantAvatars}</div>
            <div id="groupCallVisualizer" style="display:flex;align-items:center;gap:4px;height:40px;margin-top:0.5rem;">
                <div style="width:4px;height:10px;background:var(--primary);border-radius:2px;animation:bounceBar 0.8s ease-in-out infinite alternate;"></div>
                <div style="width:4px;height:10px;background:var(--secondary);border-radius:2px;animation:bounceBar 1.1s ease-in-out infinite alternate;animation-delay:0.2s;"></div>
                <div style="width:4px;height:10px;background:var(--accent);border-radius:2px;animation:bounceBar 0.9s ease-in-out infinite alternate;animation-delay:0.4s;"></div>
                <div style="width:4px;height:10px;background:var(--primary);border-radius:2px;animation:bounceBar 1.2s ease-in-out infinite alternate;animation-delay:0.1s;"></div>
                <div style="width:4px;height:10px;background:var(--secondary);border-radius:2px;animation:bounceBar 0.7s ease-in-out infinite alternate;animation-delay:0.3s;"></div>
            </div>
            <div id="groupCallAudioContainer"></div>
            <div style="display:flex;gap:2rem;margin-top:1.5rem;">
                <button id="btnGroupMute" class="btn btn-secondary" style="width:60px;height:60px;border-radius:50%;padding:0;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border:1px solid var(--border);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>
                <button id="btnEndGroupCall" class="btn" style="width:60px;height:60px;border-radius:50%;padding:0;align-items:center;justify-content:center;background:var(--accent);color:white;box-shadow:0 0 20px rgba(244,63,94,0.4);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" transform="rotate(135 12 12)"/></svg>
                </button>
            </div>
        </div>
    `;

    document.getElementById('btnEndGroupCall').addEventListener('click', () => hangUpCall('Group call ended'));
    const gMuteBtn = document.getElementById('btnGroupMute');
    gMuteBtn.addEventListener('click', () => {
        gMuteBtn.classList.toggle('active');
        if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = !gMuteBtn.classList.contains('active'); });
        gMuteBtn.style.background = gMuteBtn.classList.contains('active') ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.08)';
    });
}

function addGroupCallAudioStream(memberName, stream) {
    const container = document.getElementById('groupCallAudioContainer');
    if (!container) return;
    let audioEl = document.getElementById('groupaudio-' + memberName.toLowerCase().replace(/\W/g,'-'));
    if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = 'groupaudio-' + memberName.toLowerCase().replace(/\W/g,'-');
        audioEl.autoplay = true;
        container.appendChild(audioEl);
    }
    audioEl.srcObject = stream;
    audioEl.play().catch(()=>{});
}

function removeGroupCallAudio(memberName) {
    const audioEl = document.getElementById('groupaudio-' + memberName.toLowerCase().replace(/\W/g,'-'));
    if (audioEl) audioEl.remove();
}

// ─── AUDIO SYNTH ─────────────────────────────────────────────────────────────
let callAudioCtx = null, callRingInterval = null, ringOsc1 = null, ringOsc2 = null;
function playSyntheticRing() {
    try {
        callAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ring = () => {
            if (!callAudioCtx) return;
            const g = callAudioCtx.createGain();
            g.gain.setValueAtTime(0, callAudioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0.15, callAudioCtx.currentTime+0.1);
            g.gain.setValueAtTime(0.15, callAudioCtx.currentTime+1.2);
            g.gain.linearRampToValueAtTime(0, callAudioCtx.currentTime+1.3);
            ringOsc1 = callAudioCtx.createOscillator(); ringOsc2 = callAudioCtx.createOscillator();
            ringOsc1.type = 'sine'; ringOsc2.type = 'sine';
            ringOsc1.frequency.setValueAtTime(440, callAudioCtx.currentTime);
            ringOsc2.frequency.setValueAtTime(480, callAudioCtx.currentTime);
            ringOsc1.connect(g); ringOsc2.connect(g); g.connect(callAudioCtx.destination);
            ringOsc1.start(); ringOsc2.start();
            ringOsc1.stop(callAudioCtx.currentTime+1.3); ringOsc2.stop(callAudioCtx.currentTime+1.3);
        };
        ring(); callRingInterval = setInterval(ring, 3000);
    } catch(e){}
}
function stopSyntheticRing() {
    if (callRingInterval) { clearInterval(callRingInterval); callRingInterval = null; }
    try { if (ringOsc1) ringOsc1.stop(); } catch(e){} try { if (ringOsc2) ringOsc2.stop(); } catch(e){}
    ringOsc1 = null; ringOsc2 = null;
    if (callAudioCtx) { try { callAudioCtx.close(); } catch(e){} callAudioCtx = null; }
}
function playConnectChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(523.25, ctx.currentTime);
        o.frequency.setValueAtTime(659.25, ctx.currentTime+0.1);
        o.frequency.setValueAtTime(783.99, ctx.currentTime+0.2);
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+0.4);
        o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.45);
        setTimeout(()=>ctx.close(),1000);
    } catch(e){}
}
function playDisconnectBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(329.63, ctx.currentTime);
        o.frequency.setValueAtTime(293.66, ctx.currentTime+0.15);
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+0.35);
        o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.45);
        setTimeout(()=>ctx.close(),1000);
    } catch(e){}
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function escapeHTML(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Export
window.gamesDatabase = gamesDatabase;
window.filterGames = filterGames;
window.currentCategory = currentCategory;
window.searchQuery = searchQuery;
