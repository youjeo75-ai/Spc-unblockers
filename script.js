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
   COMMUNITY MODE - REAL P2P CHAT & VOICE CALLS (PeerJS)
═══════════════════════════════════════════ */

let currentUser = JSON.parse(localStorage.getItem('spc_current_user') || 'null');
let selectedUser = null; // { username, peerId, conn }

// PeerJS state
let peer = null;          // Our Peer instance
let activeConns = {};     // { peerId: DataConnection }
let activeCall = null;    // MediaConnection for voice
let localStream = null;   // Our mic stream
let activeChats = {};     // { username: [{ sender, text, time }] }

// ─── PEER ID HELPERS ─────────────────────────────────────────────────────────
// Map username → stable PeerJS ID (prefix to avoid collisions with random peers)
function usernameToPeerId(username) {
    return 'spc-' + username.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Helper to switch view states
function showCommunityTab() {
    const gamesView = document.getElementById('gamesView');
    const communityView = document.getElementById('communityView');
    if (gamesView && communityView) {
        gamesView.style.display = 'none';
        communityView.style.display = 'flex';
        window.location.hash = 'community';
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.textContent.trim() === 'Community') item.classList.add('active');
            else item.classList.remove('active');
        });
        renderCommunityPanel();
    }
}

function showGamesTab() {
    const gamesView = document.getElementById('gamesView');
    const communityView = document.getElementById('communityView');
    if (gamesView && communityView) {
        gamesView.style.display = 'block';
        communityView.style.display = 'none';
        if (window.location.hash === '#community') window.location.hash = '';
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.textContent.trim() === 'Home') item.classList.add('active');
            else item.classList.remove('active');
        });
    }
}

function initCommunityAuth() {
    updateAuthUI();
    
    if (window.location.hash === '#community') showCommunityTab();
    
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#community') showCommunityTab();
        else if (window.location.hash === '') showGamesTab();
    });

    // Auth Switch (Login ↔ Signup)
    const switchLink = document.getElementById('authSwitchLink');
    let isSignUp = false;
    if (switchLink) {
        switchLink.addEventListener('click', (e) => {
            e.preventDefault();
            isSignUp = !isSignUp;
            const submitBtn = document.getElementById('authSubmitBtn');
            const switchText = document.getElementById('authSwitchText');
            const authTitle = document.querySelector('#communityAuth h2');
            if (isSignUp) {
                authTitle.textContent = "REGISTER";
                submitBtn.textContent = "Create Account";
                switchText.textContent = "Already have an account?";
                switchLink.textContent = "Log In";
            } else {
                authTitle.textContent = "COMMUNITY";
                submitBtn.textContent = "Log In";
                switchText.textContent = "Don't have an account?";
                switchLink.textContent = "Sign Up";
            }
            document.getElementById('authError').style.display = 'none';
        });
    }

    // Auth Form Submit
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('authUsername');
            const passwordInput = document.getElementById('authPassword');
            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (!username || !password) { showAuthError("Please enter both username and password."); return; }
            if (username.length < 3) { showAuthError("Username must be at least 3 characters."); return; }
            if (password.length < 5) { showAuthError("Password must be at least 5 characters."); return; }

            let users = JSON.parse(localStorage.getItem('spc_users') || '[]');

            if (isSignUp) {
                if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
                    showAuthError("Username already taken."); return;
                }
                const newUser = { username, password };
                users.push(newUser);
                localStorage.setItem('spc_users', JSON.stringify(users));
                doLogin(newUser);
            } else {
                const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
                if (!user) { showAuthError("Invalid username or password."); return; }
                doLogin(user);
            }

            usernameInput.value = '';
            passwordInput.value = '';
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
        showNotification(`Logged in as ${user.username}`, 'success');
    }

    // Header Login Button
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    if (headerLoginBtn) {
        headerLoginBtn.addEventListener('click', () => {
            if (document.getElementById('communityView')) showCommunityTab();
            else window.location.href = 'index.html#community';
        });
    }

    // Header Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Destroy peer
            if (peer && !peer.destroyed) peer.destroy();
            peer = null;
            activeConns = {};
            activeCall = null;
            if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
            activeChats = {};
            selectedUser = null;
            currentUser = null;
            localStorage.removeItem('spc_current_user');
            updateAuthUI();
            const communityChat = document.getElementById('communityChat');
            const communityAuth = document.getElementById('communityAuth');
            if (communityChat && communityAuth) {
                communityChat.style.display = 'none';
                communityAuth.style.display = 'block';
            }
            showNotification("Logged out", "info");
        });
    }

    // If already logged in from a previous session, init peer
    if (currentUser) initPeer();
}

// Update authentication UI elements globally
function updateAuthUI() {
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    const userBar = document.getElementById('userBar');
    const userWelcome = document.getElementById('userWelcome');
    
    if (currentUser) {
        if (headerLoginBtn) headerLoginBtn.style.display = 'none';
        if (userBar) userBar.style.display = 'flex';
        if (userWelcome) userWelcome.textContent = `Welcome, ${currentUser.username}`;
    } else {
        if (headerLoginBtn) headerLoginBtn.style.display = 'inline-flex';
        if (userBar) userBar.style.display = 'none';
    }
}

// ─── PEEJS INIT ──────────────────────────────────────────────────────────────
function initPeer() {
    if (!currentUser) return;
    if (peer && !peer.destroyed) return; // already running

    const myPeerId = usernameToPeerId(currentUser.username);
    setPeerStatus('Connecting...');

    try {
        peer = new Peer(myPeerId, {
            // Uses free PeerJS cloud broker for signalling
            debug: 0
        });
    } catch(e) {
        setPeerStatus('PeerJS unavailable');
        return;
    }

    peer.on('open', (id) => {
        setPeerStatus('Online ✓');
        showNotification('You are now online in Community!', 'success');
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            // Someone with this username already connected — still usable
            setPeerStatus('Online (session conflict)');
        } else {
            setPeerStatus('Connection error');
            console.warn('Peer error:', err);
        }
    });

    peer.on('disconnected', () => {
        setPeerStatus('Reconnecting...');
        peer.reconnect();
    });

    // ── Incoming DATA connection ───────────────────────────────────────────
    peer.on('connection', (conn) => {
        setupDataConn(conn);
    });

    // ── Incoming VOICE call ────────────────────────────────────────────────
    peer.on('call', (call) => {
        const callerUsername = peerIdToUsername(call.peer);
        showIncomingCallUI(callerUsername, call);
    });
}

function peerIdToUsername(peerId) {
    // Reverse: 'spc-johndoe' → 'johndoe'
    return peerId.replace(/^spc-/, '');
}

function setPeerStatus(text) {
    const el = document.getElementById('peerStatusIndicator');
    if (el) el.textContent = text;
}

// ─── DATA CONNECTION SETUP ───────────────────────────────────────────────────
function setupDataConn(conn) {
    const username = peerIdToUsername(conn.peer);

    conn.on('open', () => {
        activeConns[conn.peer] = conn;
        addActiveChatTab(username, conn.peer);

        // If this person messaged us, switch to their chat
        if (!selectedUser || selectedUser.peerId !== conn.peer) {
            // Just add the tab; don't force-switch unless they sent a message
        }
    });

    conn.on('data', (data) => {
        if (data.type === 'message') {
            const msg = {
                sender: username,
                text: escapeHTML(data.text),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            saveMsg(username, msg);

            // If we're currently viewing this chat, re-render
            if (selectedUser && selectedUser.username.toLowerCase() === username.toLowerCase()) {
                renderChatMessages();
            } else {
                // Flash the tab
                flashTab(username);
                showNotification(`💬 ${username}: ${data.text.substring(0, 40)}`, 'info');
            }
        }
    });

    conn.on('close', () => {
        delete activeConns[conn.peer];
        removeActiveChatTab(username);
        if (selectedUser && selectedUser.peerId === conn.peer) {
            appendSystemMsg(`${username} disconnected.`);
        }
    });

    conn.on('error', (err) => {
        console.warn('Conn error', err);
    });
}

// ─── RENDER COMMUNITY PANEL ───────────────────────────────────────────────────
function renderCommunityPanel() {
    const communityAuth = document.getElementById('communityAuth');
    const communityChat = document.getElementById('communityChat');
    if (!communityAuth || !communityChat) return;

    if (!currentUser) {
        communityAuth.style.display = 'block';
        communityChat.style.display = 'none';
    } else {
        communityAuth.style.display = 'none';
        communityChat.style.display = 'block';
        initChatHandlers();
        initCallHandlers();
        renderActiveChatTabs();
    }
}

// ─── ACTIVE CHAT TABS (left sidebar) ─────────────────────────────────────────
function renderActiveChatTabs() {
    const list = document.getElementById('activeChatsList');
    if (!list) return;
    const usernames = Object.keys(activeChats);
    if (usernames.length === 0) {
        list.innerHTML = `<div style="padding:1rem; color:var(--text-muted); font-size:0.82rem; text-align:center;">No chats yet.<br>Type a username above and hit Chat.</div>`;
        return;
    }
    list.innerHTML = usernames.map(uname => {
        const isActive = selectedUser && selectedUser.username.toLowerCase() === uname.toLowerCase();
        const msgs = activeChats[uname] || [];
        const last = msgs[msgs.length - 1];
        const initials = uname.substring(0, 2).toUpperCase();
        return `
            <div class="online-user-item ${isActive ? 'active' : ''}" data-username="${uname}" id="chattab-${uname.toLowerCase()}" style="cursor:pointer;">
                <div style="position:relative; flex-shrink:0;">
                    <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:0.8rem;">${initials}</div>
                    <span class="user-status-dot" style="position:absolute;bottom:0;right:0;border:2px solid var(--bg-sidebar);"></span>
                </div>
                <div style="flex:1;overflow:hidden;">
                    <div style="font-weight:600;font-size:0.9rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${uname}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${last ? last.text.substring(0,30) : 'No messages yet'}</div>
                </div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.online-user-item').forEach(item => {
        item.addEventListener('click', () => {
            const uname = item.getAttribute('data-username');
            openChatWith(uname);
        });
    });
}

function addActiveChatTab(username) {
    if (!activeChats[username]) activeChats[username] = [];
    renderActiveChatTabs();
}

function removeActiveChatTab(username) {
    // Keep chat history but mark disconnected
    renderActiveChatTabs();
}

function flashTab(username) {
    const tab = document.getElementById('chattab-' + username.toLowerCase());
    if (tab) {
        tab.style.background = 'rgba(139,92,246,0.2)';
        setTimeout(() => { tab.style.background = ''; }, 1500);
    }
}

// ─── OPEN CHAT WITH USER ─────────────────────────────────────────────────────
function openChatWith(username) {
    const peerId = usernameToPeerId(username);
    selectedUser = { username, peerId };

    document.getElementById('chatEmptyState').style.display = 'none';
    document.getElementById('chatActiveState').style.display = 'flex';
    document.getElementById('activeUserName').textContent = username;
    document.getElementById('activeUserActivity').textContent = activeConns[peerId] ? 'Connected via P2P' : 'Not connected';
    document.getElementById('activeUserAvatar').textContent = username.substring(0, 2).toUpperCase();

    renderActiveChatTabs();
    renderChatMessages();
}

// ─── MESSAGES STORE ───────────────────────────────────────────────────────────
function saveMsg(withUsername, msg) {
    if (!activeChats[withUsername]) activeChats[withUsername] = [];
    activeChats[withUsername].push(msg);
    renderActiveChatTabs();
}

function appendSystemMsg(text) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    const div = document.createElement('div');
    div.style.cssText = 'text-align:center;color:var(--text-muted);font-size:0.8rem;padding:0.5rem;';
    div.textContent = text;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ─── RENDER MESSAGES ─────────────────────────────────────────────────────────
function renderChatMessages() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer || !selectedUser) return;

    const history = activeChats[selectedUser.username] || [];

    messagesContainer.innerHTML = history.length === 0
        ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.9rem;">Say hi to ${selectedUser.username}!</div>`
        : history.map(msg => {
            const isSent = msg.sender === currentUser.username || msg.sender === 'You';
            const isSystem = msg.sender === 'System';
            if (isSystem) {
                return `<div style="text-align:center;color:var(--text-muted);font-size:0.8rem;padding:0.5rem;">${msg.text}</div>`;
            }
            return `
                <div class="chat-bubble ${isSent ? 'sent' : 'received'}">
                    <div style="font-weight:700;font-size:0.75rem;margin-bottom:0.15rem;color:${isSent ? 'rgba(255,255,255,0.8)' : 'var(--primary)'};">${msg.sender}</div>
                    <div>${msg.text}</div>
                    <span class="timestamp">${msg.time}</span>
                </div>
            `;
        }).join('');

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ─── CHAT FORM HANDLER ───────────────────────────────────────────────────────
function initChatHandlers() {
    // BEGIN CHAT button
    const btnStart = document.getElementById('btnStartChat');
    if (btnStart && !btnStart._bound) {
        btnStart._bound = true;
        btnStart.addEventListener('click', () => {
            const input = document.getElementById('peerUsernameInput');
            const targetUsername = input.value.trim();
            if (!targetUsername) return;
            if (targetUsername.toLowerCase() === currentUser.username.toLowerCase()) {
                showNotification("You can't chat with yourself!", 'error'); return;
            }

            const statusEl = document.getElementById('peerConnectStatus');
            statusEl.textContent = 'Connecting...';
            input.value = '';

            const targetPeerId = usernameToPeerId(targetUsername);

            if (!peer || peer.destroyed) {
                statusEl.textContent = 'Not connected. Refresh the page.'; return;
            }

            const conn = peer.connect(targetPeerId, { reliable: true });

            conn.on('open', () => {
                statusEl.textContent = `Connected to ${targetUsername}!`;
                activeConns[targetPeerId] = conn;
                if (!activeChats[targetUsername]) activeChats[targetUsername] = [];
                addActiveChatTab(targetUsername, targetPeerId);
                openChatWith(targetUsername);
                setTimeout(() => { statusEl.textContent = ''; }, 3000);
            });

            conn.on('error', () => {
                statusEl.textContent = `${targetUsername} is not online.`;
                setTimeout(() => { statusEl.textContent = ''; }, 4000);
            });

            conn.on('data', (data) => {
                if (data.type === 'message') {
                    const msg = {
                        sender: targetUsername,
                        text: escapeHTML(data.text),
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    saveMsg(targetUsername, msg);
                    if (selectedUser && selectedUser.username.toLowerCase() === targetUsername.toLowerCase()) {
                        renderChatMessages();
                    } else {
                        flashTab(targetUsername);
                    }
                }
            });

            conn.on('close', () => {
                delete activeConns[targetPeerId];
                removeActiveChatTab(targetUsername);
                if (selectedUser && selectedUser.peerId === targetPeerId) {
                    appendSystemMsg(`${targetUsername} disconnected.`);
                }
            });

            setupDataConn(conn);
        });

        // Also allow pressing Enter in the username input
        document.getElementById('peerUsernameInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); btnStart.click(); }
        });
    }

    // SEND MESSAGE form
    const chatForm = document.getElementById('chatForm');
    if (chatForm && !chatForm._bound) {
        chatForm._bound = true;
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (!text || !selectedUser) return;

            const msg = {
                sender: currentUser.username,
                text: escapeHTML(text),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            saveMsg(selectedUser.username, msg);
            renderChatMessages();
            input.value = '';

            // Send over P2P if connected
            const conn = activeConns[selectedUser.peerId];
            if (conn && conn.open) {
                conn.send({ type: 'message', text });
            } else {
                appendSystemMsg('⚠ Not connected — message saved locally only.');
            }
        });
    }
}

// ─── VOICE CALL HANDLERS ─────────────────────────────────────────────────────
let callDurationSeconds = 0;
let callTimerInterval = null;

function initCallHandlers() {
    const btnCall = document.getElementById('btnCallUser');
    if (!btnCall || btnCall._bound) return;
    btnCall._bound = true;

    const overlay = document.getElementById('callOverlay');
    const hangUpBtn = document.getElementById('btnCallDecline');
    const muteBtn = document.getElementById('btnCallMute');

    // ── Outgoing call ──────────────────────────────────────────────────────
    btnCall.addEventListener('click', async () => {
        if (!selectedUser) return;
        if (!peer || peer.destroyed) { showNotification('Not connected to network', 'error'); return; }

        // Show overlay immediately
        overlay.style.display = 'flex';
        document.getElementById('callUserName').textContent = selectedUser.username;
        document.getElementById('callAvatar').textContent = selectedUser.username.substring(0, 2).toUpperCase();
        setCallStatus('ringing');
        document.getElementById('callVisualizer').style.display = 'none';
        muteBtn.classList.remove('active');
        muteBtn.style.background = 'rgba(255,255,255,0.08)';
        callDurationSeconds = 0;

        // Request mic
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (err) {
            overlay.style.display = 'none';
            showNotification('Microphone access denied. Allow mic to call.', 'error');
            return;
        }

        playSyntheticRing();

        // Place the call via PeerJS
        const call = peer.call(selectedUser.peerId, localStream);
        activeCall = call;

        call.on('stream', (remoteStream) => {
            stopSyntheticRing();
            playConnectChime();
            setCallStatus('connected');
            document.getElementById('callVisualizer').style.display = 'flex';
            const audio = document.getElementById('remoteAudio');
            if (audio) { audio.srcObject = remoteStream; audio.play().catch(() => {}); }
            startCallTimer();
        });

        call.on('close', () => hangUpCall('Call ended'));
        call.on('error', () => {
            stopSyntheticRing();
            overlay.style.display = 'none';
            showNotification(`${selectedUser.username} is not available`, 'error');
            if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
        });

        // If no answer after 20s, give up
        setTimeout(() => {
            if (activeCall === call && document.getElementById('callStatus').dataset.state === 'ringing') {
                hangUpCall('No answer');
            }
        }, 20000);
    });

    hangUpBtn.addEventListener('click', () => hangUpCall('Call ended'));

    muteBtn.addEventListener('click', () => {
        muteBtn.classList.toggle('active');
        if (localStream) {
            localStream.getAudioTracks().forEach(t => { t.enabled = !muteBtn.classList.contains('active'); });
        }
        if (muteBtn.classList.contains('active')) {
            muteBtn.style.background = 'rgba(244,63,94,0.2)';
            showNotification('Microphone muted', 'info');
        } else {
            muteBtn.style.background = 'rgba(255,255,255,0.08)';
            showNotification('Microphone unmuted', 'info');
        }
    });
}

function setCallStatus(state) {
    const el = document.getElementById('callStatus');
    if (!el) return;
    el.dataset.state = state;
    if (state === 'ringing') {
        el.innerHTML = `<span style="display:inline-flex;align-items:center;gap:0.5rem;">
            <span style="display:inline-block;width:8px;height:8px;background:#eab308;border-radius:50%;"></span>
            Ringing...
        </span>`;
    } else if (state === 'connected') {
        el.innerHTML = `<span style="display:inline-flex;align-items:center;gap:0.5rem;">
            <span style="display:inline-block;width:8px;height:8px;background:#22c55e;border-radius:50%;"></span>
            <span id="callDuration">Connected (00:00)</span>
        </span>`;
    }
}

function startCallTimer() {
    callDurationSeconds = 0;
    if (callTimerInterval) clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
        callDurationSeconds++;
        const mins = String(Math.floor(callDurationSeconds / 60)).padStart(2, '0');
        const secs = String(callDurationSeconds % 60).padStart(2, '0');
        const el = document.getElementById('callDuration');
        if (el) el.textContent = `Connected (${mins}:${secs})`;
    }, 1000);
}

function showIncomingCallUI(callerUsername, call) {
    const overlay = document.getElementById('incomingCallOverlay');
    if (!overlay) return;

    document.getElementById('incomingCallName').textContent = callerUsername;
    document.getElementById('incomingCallAvatar').textContent = callerUsername.substring(0, 2).toUpperCase();
    overlay.style.display = 'flex';
    playSyntheticRing();

    // Make sure tab exists for caller
    if (!activeChats[callerUsername]) activeChats[callerUsername] = [];
    addActiveChatTab(callerUsername);

    const acceptBtn = document.getElementById('btnAcceptCall');
    const declineBtn = document.getElementById('btnDeclineCall');

    const doAccept = async () => {
        stopSyntheticRing();
        overlay.style.display = 'none';
        cleanup();

        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
            showNotification('Microphone access denied.', 'error'); return;
        }

        call.answer(localStream);
        activeCall = call;

        // Show active call overlay
        const callOverlay = document.getElementById('callOverlay');
        callOverlay.style.display = 'flex';
        document.getElementById('callUserName').textContent = callerUsername;
        document.getElementById('callAvatar').textContent = callerUsername.substring(0, 2).toUpperCase();
        setCallStatus('connected');
        document.getElementById('callVisualizer').style.display = 'flex';
        playConnectChime();
        startCallTimer();

        call.on('stream', (remoteStream) => {
            const audio = document.getElementById('remoteAudio');
            if (audio) { audio.srcObject = remoteStream; audio.play().catch(() => {}); }
        });

        call.on('close', () => hangUpCall('Call ended'));
    };

    const doDecline = () => {
        stopSyntheticRing();
        overlay.style.display = 'none';
        call.close();
        cleanup();
    };

    function cleanup() {
        acceptBtn.removeEventListener('click', doAccept);
        declineBtn.removeEventListener('click', doDecline);
    }

    acceptBtn.addEventListener('click', doAccept);
    declineBtn.addEventListener('click', doDecline);
}

function hangUpCall(logStatus) {
    stopSyntheticRing();
    if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    if (activeCall) { try { activeCall.close(); } catch(e) {} activeCall = null; }
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }

    const audio = document.getElementById('remoteAudio');
    if (audio) { audio.srcObject = null; }

    const overlay = document.getElementById('callOverlay');
    if (overlay) overlay.style.display = 'none';

    playDisconnectBeep();

    if (selectedUser) {
        const mins = String(Math.floor(callDurationSeconds / 60)).padStart(2, '0');
        const secs = String(callDurationSeconds % 60).padStart(2, '0');
        const systemMsg = {
            sender: 'System',
            text: `📞 Voice Call — ${logStatus} (${mins}:${secs})`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        saveMsg(selectedUser.username, systemMsg);
        renderChatMessages();
    }
}

// ─── AUDIO SYNTHESIZERS ──────────────────────────────────────────────────────
let callAudioCtx = null;
let callRingInterval = null;
let ringOsc1 = null;
let ringOsc2 = null;

function playSyntheticRing() {
    try {
        callAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ring = () => {
            if (!callAudioCtx) return;
            const gain = callAudioCtx.createGain();
            gain.gain.setValueAtTime(0, callAudioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, callAudioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, callAudioCtx.currentTime + 1.2);
            gain.gain.linearRampToValueAtTime(0, callAudioCtx.currentTime + 1.3);
            ringOsc1 = callAudioCtx.createOscillator();
            ringOsc2 = callAudioCtx.createOscillator();
            ringOsc1.type = 'sine'; ringOsc2.type = 'sine';
            ringOsc1.frequency.setValueAtTime(440, callAudioCtx.currentTime);
            ringOsc2.frequency.setValueAtTime(480, callAudioCtx.currentTime);
            ringOsc1.connect(gain); ringOsc2.connect(gain);
            gain.connect(callAudioCtx.destination);
            ringOsc1.start(); ringOsc2.start();
            ringOsc1.stop(callAudioCtx.currentTime + 1.3);
            ringOsc2.stop(callAudioCtx.currentTime + 1.3);
        };
        ring();
        callRingInterval = setInterval(ring, 3000);
    } catch(e) {}
}

function stopSyntheticRing() {
    if (callRingInterval) { clearInterval(callRingInterval); callRingInterval = null; }
    try { if (ringOsc1) ringOsc1.stop(); } catch(e) {}
    try { if (ringOsc2) ringOsc2.stop(); } catch(e) {}
    ringOsc1 = null; ringOsc2 = null;
    if (callAudioCtx) { try { callAudioCtx.close(); } catch(e) {} callAudioCtx = null; }
}

function playConnectChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.45);
        setTimeout(() => ctx.close(), 1000);
    } catch(e) {}
}

function playDisconnectBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, ctx.currentTime);
        osc.frequency.setValueAtTime(293.66, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.45);
        setTimeout(() => ctx.close(), 1000);
    } catch(e) {}
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Export for potential module usage
window.gamesDatabase = gamesDatabase;
window.filterGames = filterGames;
window.currentCategory = currentCategory;
window.searchQuery = searchQuery;
