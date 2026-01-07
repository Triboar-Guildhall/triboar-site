(function() {
    'use strict';

    let currentSort = { column: 'Name', direction: 'asc' };
    let filteredItems = [...itemsData];

    // Rarity order for sorting
    const rarityOrder = {
        'Common (mundane)': 0,
        'Common': 1,
        'Uncommon': 2,
        'Rare': 3,
        'Very Rare': 4,
        'Legendary': 5,
        'Artifact': 6
    };

    // Rarity colors for badges
    const rarityColors = {
        'Common (mundane)': 'bg-gray-200 text-gray-700',
        'Common': 'bg-gray-300 text-gray-800',
        'Uncommon': 'bg-green-100 text-green-800',
        'Rare': 'bg-blue-100 text-blue-800',
        'Very Rare': 'bg-purple-100 text-purple-800',
        'Legendary': 'bg-amber-100 text-amber-800',
        'Artifact': 'bg-red-100 text-red-800'
    };

    // Initialize the page
    function init() {
        populateFilters();
        renderTable();
        setupEventListeners();
        updateResultCount();
    }

    // Populate filter dropdowns with unique values
    function populateFilters() {
        const rarities = [...new Set(itemsData.map(item => item.Rarity))].sort((a, b) => {
            return (rarityOrder[a] ?? 99) - (rarityOrder[b] ?? 99);
        });
        const types = [...new Set(itemsData.map(item => item.Type))].sort();
        const sources = [...new Set(itemsData.map(item => item.Source))].sort();

        // Extract unique tools (items can have multiple comma-separated tools)
        const toolsSet = new Set();
        itemsData.forEach(item => {
            if (item.Tools) {
                item.Tools.split(',').forEach(tool => {
                    const trimmed = tool.trim();
                    if (trimmed && trimmed !== 'As Base Item') {
                        toolsSet.add(trimmed);
                    }
                });
            }
        });
        const tools = [...toolsSet].sort();

        populateSelect('filterRarity', rarities, 'All Rarities');
        populateSelect('filterType', types, 'All Types');
        populateSelect('filterSource', sources, 'All Sources');
        populateSelect('filterTools', tools, 'All Tools');
    }

    function populateSelect(id, options, defaultText) {
        const select = document.getElementById(id);
        select.innerHTML = `<option value="">${defaultText}</option>`;
        options.forEach(option => {
            if (option) {
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                select.appendChild(opt);
            }
        });
    }

    // Setup event listeners
    function setupEventListeners() {
        // Search input
        document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 200));

        // Filter dropdowns
        ['filterRarity', 'filterType', 'filterSource', 'filterTools', 'filterAttunement', 'filterUse'].forEach(id => {
            document.getElementById(id).addEventListener('change', applyFilters);
        });

        // Clear filters
        document.getElementById('clearFilters').addEventListener('click', clearFilters);

        // Sort headers
        document.querySelectorAll('[data-sort]').forEach(header => {
            header.addEventListener('click', () => handleSort(header.dataset.sort));
        });
    }

    // Debounce function for search
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Apply all filters
    function applyFilters() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const rarity = document.getElementById('filterRarity').value;
        const type = document.getElementById('filterType').value;
        const source = document.getElementById('filterSource').value;
        const tools = document.getElementById('filterTools').value;
        const attunement = document.getElementById('filterAttunement').value;
        const use = document.getElementById('filterUse').value;

        filteredItems = itemsData.filter(item => {
            if (search && !item.Name.toLowerCase().includes(search)) return false;
            if (rarity && item.Rarity !== rarity) return false;
            if (type && item.Type !== type) return false;
            if (source && item.Source !== source) return false;
            if (tools && (!item.Tools || !item.Tools.split(',').map(t => t.trim()).includes(tools))) return false;
            if (attunement && item.Attunement !== attunement) return false;
            if (use && item.Use !== use) return false;
            return true;
        });

        sortItems();
        renderTable();
        updateResultCount();
    }

    // Clear all filters
    function clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterRarity').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterSource').value = '';
        document.getElementById('filterTools').value = '';
        document.getElementById('filterAttunement').value = '';
        document.getElementById('filterUse').value = '';
        filteredItems = [...itemsData];
        sortItems();
        renderTable();
        updateResultCount();
    }

    // Handle column sort
    function handleSort(column) {
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }
        sortItems();
        renderTable();
        updateSortIndicators();
    }

    // Sort items
    function sortItems() {
        const { column, direction } = currentSort;
        const modifier = direction === 'asc' ? 1 : -1;

        filteredItems.sort((a, b) => {
            let valA = a[column] || '';
            let valB = b[column] || '';

            // Special handling for Rarity
            if (column === 'Rarity') {
                return ((rarityOrder[valA] ?? 99) - (rarityOrder[valB] ?? 99)) * modifier;
            }

            // Special handling for Value (numeric sort)
            if (column === 'Value' || column === 'Cost') {
                const numA = parseFloat(String(valA).replace(/[^0-9.-]/g, '')) || 0;
                const numB = parseFloat(String(valB).replace(/[^0-9.-]/g, '')) || 0;
                return (numA - numB) * modifier;
            }

            // String comparison
            return String(valA).localeCompare(String(valB)) * modifier;
        });
    }

    // Update sort indicators
    function updateSortIndicators() {
        document.querySelectorAll('[data-sort]').forEach(header => {
            const indicator = header.querySelector('.sort-indicator');
            if (header.dataset.sort === currentSort.column) {
                indicator.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
            } else {
                indicator.textContent = '';
            }
        });
    }

    // Render the table
    function renderTable() {
        const tbody = document.getElementById('itemsBody');
        const noResults = document.getElementById('noResults');
        const table = document.getElementById('itemsTable');

        if (filteredItems.length === 0) {
            tbody.innerHTML = '';
            table.parentElement.classList.add('hidden');
            noResults.classList.remove('hidden');
            return;
        }

        table.parentElement.classList.remove('hidden');
        noResults.classList.add('hidden');

        tbody.innerHTML = filteredItems.map((item, index) => {
            const rarityClass = rarityColors[item.Rarity] || 'bg-gray-100 text-gray-700';
            const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

            return `
                <tr class="${rowClass} hover:bg-guild-beige-light transition-colors">
                    <td class="px-4 py-3 font-medium text-guild-brown">${escapeHtml(item.Name)}</td>
                    <td class="px-4 py-3">
                        <span class="inline-block px-2 py-1 rounded text-xs font-medium ${rarityClass}">${escapeHtml(item.Rarity)}</span>
                    </td>
                    <td class="px-4 py-3 text-gray-700">${escapeHtml(item.Cost)}</td>
                    <td class="px-4 py-3 text-gray-600">${escapeHtml(item.Type)}</td>
                    <td class="px-4 py-3 text-gray-600 hidden md:table-cell">${escapeHtml(item.Source)}</td>
                    <td class="px-4 py-3 text-center hidden lg:table-cell">
                        ${item.Craftable === 'Yes' ? '<span class="text-green-600">✓</span>' : '<span class="text-gray-400">—</span>'}
                    </td>
                    <td class="px-4 py-3 text-gray-600 text-sm hidden lg:table-cell">${escapeHtml(item.Tools || '—')}</td>
                    <td class="px-4 py-3 text-center hidden md:table-cell">
                        ${item.Attunement === 'Yes' ? '<span class="text-purple-600">✓</span>' : '<span class="text-gray-400">—</span>'}
                    </td>
                    <td class="px-4 py-3 text-gray-600 hidden lg:table-cell">
                        <span class="${item.Use === 'Consumable' ? 'text-orange-600' : 'text-gray-600'}">${escapeHtml(item.Use)}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Update result count
    function updateResultCount() {
        const count = document.getElementById('resultCount');
        const total = itemsData.length;
        const showing = filteredItems.length;

        if (showing === total) {
            count.textContent = `Showing all ${total} items`;
        } else {
            count.textContent = `Showing ${showing} of ${total} items`;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
