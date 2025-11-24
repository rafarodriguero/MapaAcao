// IMEA Data

// Global variables
let map;
let markers = [];
let actionsData = [];
let currentFilter = { Tipo_Acao: 'all', Municipio: 'all', Data: 'all' };
let wasteChart;
let dataInicio = converteData('2000-01-01');
let dataFim = converteData('2999-12-31');
const initialView = { lat: -23.57, lng: -45.18, zoom: 9 };

// Format number to Brazilian format
function formatNumber(num) {
  return num.toFixed(2).replace('.', ',');
}

// Calculate marker size based on weight
function getMarkerSize(weight) {
  const minSize = 8;
  const maxSize = 30;
  const minWeight = 0.12;
  const maxWeight = 6.62;
  
  if (weight <= minWeight) return minSize;
  if (weight >= maxWeight) return maxSize;
  
  return minSize + ((weight - minWeight) / (maxWeight - minWeight)) * (maxSize - minSize);
}

// Get marker color based on weight
function getMarkerColor(weight) {
  const intensity = Math.min(weight / 7, 1);
  const lightness = 180 - (intensity * 100);
  return `hsl(195, 70%, ${lightness / 2.5}%)`;
}

// Initialize map
function initMap() {
  map = L.map('map').setView([initialView.lat, initialView.lng], initialView.zoom);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(map);
  
  addMarkersToMap();
}

// Create popup content
function createPopupContent(action) {
  return `
    <div class="popup-content">
      <div class="popup-title">${action.Local_Nome}</div>
      
      <div class="popup-info">
        <div class="popup-label">Data</div>
        <div class="popup-value">${action.Data}</div>
      </div>
      
      <div class="popup-info">
        <div class="popup-label">Tipo de Ação</div>
        <div class="popup-value">${action.Tipo_Acao}</div>
      </div>
      
      <div class="popup-info">
        <div class="popup-label">Total Coletado</div>
        <div class="popup-value"><strong>${formatNumber(action.Peso_Total_KG)} kg</strong></div>
      </div>
      
      <div class="popup-info">
        <div class="popup-label">Participantes</div>
        <div class="popup-value">${action.Num_Participantes} pessoas</div>
      </div>
      
      <div class="popup-waste-breakdown">
        <h4>Resíduos Coletados</h4>
        ${action.Redes_Pesca_KG > 0 ? `<div class="waste-item"><span>Redes de Pesca:</span><span>${formatNumber(action.Redes_Pesca_KG)} kg</span></div>` : ''}
        ${action.Plastico_KG > 0 ? `<div class="waste-item"><span>Plástico:</span><span>${formatNumber(action.Plastico_KG)} kg</span></div>` : ''}
        ${action.Metal_KG > 0 ? `<div class="waste-item"><span>Metal:</span><span>${formatNumber(action.Metal_KG)} kg</span></div>` : ''}
        ${action.Vidro_KG > 0 ? `<div class="waste-item"><span>Vidro:</span><span>${formatNumber(action.Vidro_KG)} kg</span></div>` : ''}
        ${action.Papel_Papelao_KG > 0 ? `<div class="waste-item"><span>Vidro:</span><span>${formatNumber(action.Papel_Papelao_KG)} kg</span></div>` : ''}
        ${action.Borracha_KG > 0 ? `<div class="waste-item"><span>Vidro:</span><span>${formatNumber(action.Borracha_KG)} kg</span></div>` : ''}
        ${action.Tecido_KG > 0 ? `<div class="waste-item"><span>Vidro:</span><span>${formatNumber(action.Tecido_KG)} kg</span></div>` : ''}
        ${action.Outros_KG > 0 ? `<div class="waste-item"><span>Outros:</span><span>${formatNumber(action.Outros_KG)} kg</span></div>` : ''}
      </div>
      
      ${action.observations ? `
      <div class="popup-info" style="margin-top: 12px;">
        <div class="popup-label">Observações</div>
        <div class="popup-value" style="font-size: 11px;">${action.observations}</div>
      </div>
      ` : ''}
    </div>
  `;
}

// Add markers to map
function addMarkersToMap() {
  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
  
  const filteredActions = getFilteredActions();
  
  filteredActions.forEach(action => {
    const size = getMarkerSize(action.Peso_Total_KG);
    const color = getMarkerColor(action.Peso_Total_KG);
    
    const marker = L.circleMarker([action.Latitude, action.Longitude], {
      radius: size,
      fillColor: color,
      color: '#01579B',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.6
    });
    
    // Tooltip on hover
    marker.bindTooltip(
      `<strong>${action.location}</strong><br>${formatNumber(action.Peso_Total_KG)} kg`,
      { direction: 'top', offset: [0, -10] }
    );
    
    // Popup on click
    marker.bindPopup(createPopupContent(action));
    
    // Store action data with marker
    marker.actionId = action.id;
    
    // Add click handler to highlight in sidebar
    marker.on('click', () => {
      highlightActionInList(action.id);
    });
    
    marker.addTo(map);
    markers.push(marker);
  });
}

// Get filtered actions
function getFilteredActions() {
  return actionsData.filter(action => {
    const typeMatch = currentFilter.Tipo_Acao === 'all' || action.Tipo_Acao === currentFilter.Tipo_Acao;
    const municipalityMatch = currentFilter.Municipio === 'all' || action.Municipio === currentFilter.Municipio;
    const date = converteData(action.Data) >= dataInicio && converteData(action.Data) <= dataFim
    return typeMatch && municipalityMatch && date;
  });
  /*VERIFICAR FILTRO, RETIRAR DATA INICIAL DAS VARIAVEIS E TRABALHAR COM DATA ALL */
}

// Update statistics
function updateStatistics() {
  const filteredActions = getFilteredActions();
  const totalActions = filteredActions.length;
  const totalWeight = filteredActions.reduce((sum, action) => sum + action.Peso_Total_KG, 0);
  const uniqueLocations = new Set(filteredActions.map(action => action.Local_Nome)).size;
  const totalVonteers = filteredActions.reduce((sum, action) => sum + action.Num_Participantes, 0);
  

  document.getElementById('total-actions').textContent = totalActions;
  document.getElementById('total-weight').textContent = formatNumber(totalWeight);
  document.getElementById('total-locations').textContent = uniqueLocations;
  document.getElementById('total-volunteers').textContent = totalVonteers;
}

// Initialize waste chart
function initWasteChart() {
  const ctx = document.getElementById('wasteChart').getContext('2d');
  
  const filteredActions = getFilteredActions();
  const totalFishingNets = filteredActions.reduce((sum, action) => sum + action.Redes_Pesca_KG, 0);
  const totalPlastic = filteredActions.reduce((sum, action) => sum + action.Plastico_KG, 0);
  const totalMetal = filteredActions.reduce((sum, action) => sum + action.Metal_KG, 0);
  const totalGlass = filteredActions.reduce((sum, action) => sum + action.Vidro_KG, 0);
  const totalPaper = filteredActions.reduce((sum, action) => sum + action.Papel_Papelao_KG, 0);
  const totalRubber = filteredActions.reduce((sum, action) => sum + action.Borracha_KG, 0);
  const totalFabric = filteredActions.reduce((sum, action) => sum + action.Tecido_KG, 0);
  const totalOther = filteredActions.reduce((sum, action) => sum + action.Outros_KG, 0);
  
  const data = {
    labels: ['Redes', 'Plástico', 'Metal', 'Vidro', 'Papel/Papelão','Borracha', 'Tecido', 'Outros'],
    datasets: [{
      data: [totalFishingNets, totalPlastic, totalMetal, totalGlass, totalPaper, totalRubber, totalFabric, totalOther],
      backgroundColor: [
        '#1FB8CD',
        '#FFC185',
        '#B4413C',
        '#5D878F',
        '#D2BA4C',
        '#71d5eeff',
        '#c71a8dff',
        '#724204ff'
      ],
      borderWidth: 0
    }]
  };
  
  if (wasteChart) {
    wasteChart.destroy();
  }
  
  wasteChart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatNumber(context.parsed.y) + ' kg';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatNumber(value) + ' kg';
            }
          }
        }
      }
    }
  });
}

// Update top locations
function updateTopLocations() {
  const filteredActions = getFilteredActions();
  const sortedActions = [...filteredActions].sort((a, b) => b.Peso_Total_KG - a.Peso_Total_KG);
  const topThree = sortedActions.slice(0, 3);
  
  const container = document.getElementById('top-locations-list');
  container.innerHTML = topThree.map(action => `
    <div class="top-location-item">
      <div class="top-location-name">${action.Local_Nome}</div>
      <div class="top-location-weight">${formatNumber(action.Peso_Total_KG)} kg</div>
    </div>
  `).join('');
}

// Update actions list
function updateActionsList() {
  const filteredActions = getFilteredActions();
  const sortedActions = [...filteredActions].sort((a, b) => b.Peso_Total_KG - a.Peso_Total_KG);
  
  const container = document.getElementById('actions-list');
  container.innerHTML = sortedActions.map(action => `
    <div class="action-item" data-action-id="${action.id}">
      <div class="action-header">
        <div class="action-location">${action.Local_Nome}</div>
        <div class="action-weight">${formatNumber(action.Peso_Total_KG)} kg</div>
      </div>
      <div class="action-details">
        <span class="action-type">${action.Tipo_Acao}</span>
        <span>${action.Data}</span> • <span>${action.Num_Participantes} participantes</span>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.action-item').forEach(item => {
    item.addEventListener('click', () => {
      const actionId = item.dataset.actionId;
      const action = actionsData.find(a => a.id === actionId);
      if (action) {
        map.setView([action.Latitude, action.Longitude], 15);
        const marker = markers.find(m => m.actionId === actionId);
        if (marker) {
          marker.openPopup();
        }
        highlightActionInList(actionId);
      }
    });
  });
}

// Highlight action in list
function highlightActionInList(actionId) {
  document.querySelectorAll('.action-item').forEach(item => {
    item.classList.remove('active');
  });
  const targetItem = document.querySelector(`[data-action-id="${actionId}"]`);
  if (targetItem) {
    targetItem.classList.add('active');
    targetItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

//===============================================================
//===============CONVERTE DATA ==================================
//===============================================================
function converteData(DataDDMMYY) {
    const dataSplit = DataDDMMYY.split("-");
    const novaData = new Date(parseInt(dataSplit[0], 10),
                  parseInt(dataSplit[1], 10) - 1,
                  parseInt(dataSplit[2], 10));
    return novaData;
}

// Initialize filters
function initFilters() {
  // Populate municipalities
  const municipalities = [...new Set(actionsData.map(action => action.Municipio))];
  const municipalitySelect = document.getElementById('filter-municipality');
  municipalities.forEach(municipality => {
    const option = document.createElement('option');
    option.value = municipality;
    option.textContent = municipality;
    municipalitySelect.appendChild(option);
  });
  
  // Add event listeners
  document.getElementById('filter-type').addEventListener('change', (e) => {
    currentFilter.Tipo_Acao = e.target.value;
    updateView();
  });
  
  document.getElementById('filter-municipality').addEventListener('change', (e) => {
    currentFilter.Municipio = e.target.value;
    updateView();
  });

  document.getElementById('filter-date-from').addEventListener('change', (e) => {
    data = e.target.value;
    dataInicio = converteData(data)
    updateView();
  });

  document.getElementById('filter-date-to').addEventListener('change', (e) => {
    data = e.target.value;
    dataFim = converteData(data)
    updateView();
  });
  
  document.getElementById('reset-filters').addEventListener('click', () => {
    currentFilter = { Tipo_Acao: 'all', Municipio: 'all', Data: '' };
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-municipality').value = 'all';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    dataInicio = converteData('2000-01-01');
    dataFim = converteData('2999-12-31');
    updateView();
  });
}

// ============================================================================
// FUNÇÃO: Carregar dados do arquivo CSV
// ============================================================================
async function loadCSVData() {
    try {
        console.log('Buscando arquivo CSV...');
        
        // Buscar o arquivo CSV
        const response = await fetch('base_dados_acoes_limpeza_IMEA.csv');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV carregado com sucesso');
        
        // Parser CSV
        actionsData = parseCSV(csvText);
        console.log(`Total de registros carregados: ${actionsData.length}`);
        
        // Definir dados filtrados
        //filteredData = [...actionsData];
        
    } catch (error) {
        console.error('Erro ao carregar CSV:', error);
        showErrorMessage('Erro ao carregar dados: ' + error.message);
    }
}

// ============================================================================
// FUNÇÃO: Parser CSV robusto
// ============================================================================
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        console.warn('CSV vazio ou inválido');
        return [];
    }
    
    // Extrair headers (primeira linha)
    const headers = parseCSVLine(lines[0]);
    console.log('Headers encontrados:', headers);
    
    // Processar dados (linhas restantes)
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Pular linhas vazias
        
        try {
            const values = parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                let value = values[index] || '';
                
                // Converter números
                if (['Latitude', 'Longitude', 'Peso_Total_KG', 'Redes_Pesca_KG', 
                     'Plastico_KG', 'Metal_KG', 'Vidro_KG', 'Papel_Papelao_KG',
                     'Borracha_KG', 'Tecido_KG', 'Outros_KG', 'Num_Participantes'].includes(header)) {
                    value = parseFloat(value) || 0;
                } else {
                    value = value.trim();
                }
                
                row[header] = value;
            });
            
            // Validação básica
            if (row.Latitude && row.Longitude && row.Peso_Total_KG) {
                data.push(row);
            }
        } catch (error) {
            console.warn(`Erro ao processar linha ${i}:`, error);
        }
    }
    
    return data;
}

// ============================================================================
// FUNÇÃO: Parse de linha CSV (suporta aspas)
// ============================================================================
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                current += '"';
                i++; // Pular próximo aspas
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Update entire view
function updateView() {
  updateStatistics();
  initWasteChart();
  updateTopLocations();
  updateActionsList();
  addMarkersToMap();
}

// Reset map view
function resetMapView() {
  map.setView([initialView.lat, initialView.lng], initialView.zoom);
}

// Initialize application
async function init() {
  initMap();
  await loadCSVData();
  initFilters();
  updateView();
  
  // Reset view button
  document.getElementById('reset-view').addEventListener('click', resetMapView);
  
  // Set last update date
  document.getElementById('last-update').textContent = '04/11/2025';
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
