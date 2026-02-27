document.addEventListener('DOMContentLoaded', () => {

    // --- DOM refs ---
    // Usamos el nuevo ID del botón que pusimos en el HTML
    const btnCargarAuto = document.getElementById('btnCargarGeoJSON');
    const idSelect = document.getElementById('idSelect');
    const labelSelect = document.getElementById('labelSelect');
    const variableSelect = document.getElementById('variableSelect');
    const classificationSelect = document.getElementById('classificationSelect');
    const paletteSelect = document.getElementById('paletteSelect');

    // --- INIT MAP (Centrado en Barcelos, Portugal) ---
    const map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true
    }).setView([41.5388, -8.6151], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // --- GLOBALS ---
    let geojsonData, geojsonLayer, legend;
    let currentBreaks = [], currentPalette = [];

    const palettes = {
        blue:['#00f2ff','#00bfff','#007fff','#0040ff','#0000cc'],
        red:['#ffcccc','#ff6666','#ff0000','#cc0000','#800000'],
        green:['#ccffcc','#66ff66','#00cc00','#009900','#006600'],
        azure:['#ffffff','#cdd3ec','#7f8dc6','#555fa3','#2a3180'], 
        purple:['#f2ccff','#d280ff','#a800ff','#7000cc','#3a0066'],
        fire:['#fff5cc','#ffb84d','#ff8c1a','#e65c00','#993d00']
    };

    // --- FUNCIONES DE LIMPIEZA Y CÁLCULO ---

    function parseValue(val) {
        if (val === null || val === undefined) return NaN;
        const clean = val.toString().replace(',', '.').trim();
        return parseFloat(clean);
    }

    function computeBreaks(variable, method){
        const values = geojsonData.features
            .map(f => parseValue(f.properties[variable]))
            .filter(v => !isNaN(v))
            .sort((a,b) => a - b);

        if(values.length === 0) return [];
        const k = 5;

        if (values[0] === values[values.length - 1]) {
            return Array.from({length: k + 1}, (_, i) => values[0] + i);
        }

        if(method === 'equal'){
            const min = values[0];
            const max = values[values.length-1];
            const step = (max - min) / k;
            return Array.from({length: k+1}, (_, i) => min + i * step);
        }
        if(method === 'quantile'){
            return Array.from({length: k+1}, (_, i) => {
                const pos = i * (values.length - 1) / k;
                const base = Math.floor(pos);
                const rest = pos - base;
                return values[base + 1] !== undefined
                    ? values[base] + rest * (values[base + 1] - values[base])
                    : values[base];
            });
        }
        if(method === 'jenks') return jenksBreaks(values, k);
        return [];
    }

    function jenksBreaks(data, nClasses){
        const lower = Array(data.length+1).fill(0).map(()=>Array(nClasses+1).fill(0));
        const variance = Array(data.length+1).fill(0).map(()=>Array(nClasses+1).fill(0));
        for(let i=1;i<=nClasses;i++){
            lower[1][i]=1; variance[1][i]=0;
            for(let j=2;j<=data.length;j++) variance[j][i]=Infinity;
        }
        for(let l=2;l<=data.length;l++){
            let sum=0, sumSquares=0, w=0;
            for(let m=1;m<=l;m++){
                const i3=l-m+1;
                const val=data[i3-1];
                w++; sum+=val; sumSquares+=val*val;
                const v=sumSquares-(sum*sum)/w;
                if(i3>1){
                    for(let j=2;j<=nClasses;j++){
                        if(variance[l][j]>=v+variance[i3-1][j-1]){
                            lower[l][j]=i3;
                            variance[l][j]=v+variance[i3-1][j-1];
                        }
                    }
                }
            }
            lower[l][1]=1;
            variance[l][1]=sumSquares-(sum*sum)/w;
        }
        const breaks = Array(nClasses+1);
        breaks[0]=data[0];
        breaks[nClasses]=data[data.length-1];
        let kTemp=data.length;
        for(let j=nClasses;j>1;j--){
            breaks[j-1]=data[lower[kTemp][j]-2];
            kTemp=lower[kTemp][j]-1;
        }
        return breaks;
    }

    function getColorDiscrete(v, breaks, palette){
        if(isNaN(v)) return '#333';
        for(let i=0;i<breaks.length-1;i++){
            if(v>=breaks[i] && v<=breaks[i+1]) return palette[i];
        }
        return palette[palette.length-1];
    }

    function styleFeature(feature){
        const v = parseValue(feature.properties[variableSelect.value]);
        return {
            fillColor: getColorDiscrete(v, currentBreaks, currentPalette),
            weight: 1,
            color: '#555',
            fillOpacity: 0.9
        };
    }

    // --- EVENTOS Y UI ---

    function onEachFeature(feature, layer){
        layer.on({ 
            mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 2, color: '#fff', fillOpacity: 1 });
                highlightLegend(parseValue(l.feature.properties[variableSelect.value]));
            }, 
            mouseout: (e) => {
                geojsonLayer.resetStyle(e.target);
                resetLegendHighlight();
            } 
        });
        
        layer.bindTooltip(() => {
            const idVar = idSelect.value;
            const labelVar = labelSelect.value;
            const valVar = variableSelect.value;
            return `<b>${feature.properties[idVar]}</b><br>${labelVar}: ${feature.properties[valVar]}`;
        }, { className: 'custom', sticky: true });
    }

    function addLegend(){
        if(legend) map.removeControl(legend);
        legend = L.control({position:'bottomright'});
        legend.onAdd = function(){
            const div = L.DomUtil.create('div','legend');
            currentPalette.forEach((c,i)=>{
                const item = document.createElement('div');
                item.className='range-item';
                item.style.background = c;
                const valLabel = currentBreaks[i+1].toLocaleString('pt-PT', {maximumFractionDigits: 1});
                item.innerText = valLabel;
                item.dataset.min = currentBreaks[i];
                item.dataset.max = currentBreaks[i+1];
                div.appendChild(item);
            });
            return div;
        };
        legend.addTo(map);
    }

    function highlightLegend(val){
        document.querySelectorAll('.legend .range-item').forEach(item=>{
            const min=parseFloat(item.dataset.min);
            const max=parseFloat(item.dataset.max);
            item.classList.toggle('highlighted', val>=min && val<=max);
        });
    }

    function resetLegendHighlight(){
        document.querySelectorAll('.legend .range-item').forEach(i=>i.classList.remove('highlighted'));
    }

    function updateMap() {
        if (!geojsonLayer) return;
        const variableActual = variableSelect.value;
        const mainTitle = document.getElementById('mainTitle');
        if (mainTitle) mainTitle.innerText = `DISTRIBUIÇÃO DE: ${variableActual.toUpperCase()}`;
        
        geojsonLayer.setStyle(styleFeature);
        addLegend();
    }

    // --- CARGA AUTOMÁTICA (FETCH) ---
    btnCargarAuto.onclick = () => {
        // CAMBIA 'barcelos.geojson' POR EL NOMBRE EXACTO DE TU ARCHIVO EN GITHUB
        const url = 'barcelos.geojson'; 

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("No se encontró el archivo GeoJSON");
                return res.json();
            })
            .then(data => {
                geojsonData = data;
                if(geojsonLayer) map.removeLayer(geojsonLayer);

                geojsonLayer = L.geoJSON(geojsonData, {
                    style: styleFeature, 
                    onEachFeature: onEachFeature
                }).addTo(map);

                map.fitBounds(geojsonLayer.getBounds());

                // Llenar selectores
                idSelect.innerHTML=''; labelSelect.innerHTML=''; variableSelect.innerHTML='';
                const props = geojsonData.features[0].properties;
                for(const k in props){
                    idSelect.add(new Option(k,k));
                    labelSelect.add(new Option(k,k));
                    if(!isNaN(parseValue(props[k]))){
                        variableSelect.add(new Option(k,k));
                    }
                }
                
                currentPalette = palettes[paletteSelect.value];
                currentBreaks = computeBreaks(variableSelect.value, classificationSelect.value);
                updateMap();
            })
            .catch(err => {
                alert("Error al cargar GeoJSON: " + err.message);
                console.error(err);
            });
    };

    // Escuchar cambios en los selectores
    [idSelect,labelSelect,variableSelect,classificationSelect,paletteSelect]
    .forEach(el => el.addEventListener('change',()=>{
        if(!geojsonData) return;
        currentPalette = palettes[paletteSelect.value];
        currentBreaks = computeBreaks(variableSelect.value, classificationSelect.value);
        updateMap();
    }));
});