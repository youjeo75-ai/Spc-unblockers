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

    // Login button - show info toast

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
            if (window.innerWidth <= 768) {
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

// Export for potential module usage
window.gamesDatabase = gamesDatabase;
window.filterGames = filterGames;
window.currentCategory = currentCategory;
window.searchQuery = searchQuery;
