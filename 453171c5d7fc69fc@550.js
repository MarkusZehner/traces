function _hideUI_Robust(html){return(
html`<style>
  /* Hide every cell that doesn't contain a visible input or canvas */
  .observablehq:not(:has(canvas)):not(:has(input)):not(:has(h1)) {
    display: none !important;
  }
  
  /* Hide the code 'gutter' and back-links */
  .observablehq--cite, .observablehq--inspect {
    display: none !important;
  }
</style>`
)}

function _2(html) {
  return html`
    <div class="title-wrapper">
      <h1 id="chart-title">Alumni Traces</h1>
      <p class="chart-description">
        This visualization tracks the career paths and geographic distribution 
        of alumni over time. Use the mouse to rotate the globe and explore.
        Click once to start your own trace. Doubleclick to save the current draft without adding another point.
        You can use the searchbox to add points!
      </p>
    </div>

    <style>
      .observablehq:has(#chart-title) {
        background: transparent !important;
        pointer-events: none !important;
        position: relative;
        z-index: -1; 
      }

      .title-wrapper {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        pointer-events: none;
        padding: 20px; /* Moved padding here for better alignment */
      }

      #chart-title {
        font-family: sans-serif;
        margin: 0;
        color: #333; 
        background: transparent;
      }

      /* Styling for your small print */
      .chart-description {
        font-family: sans-serif;
        font-size: 0.85rem;
        color: #666;
        margin-top: 5px;
        max-width: 400px; /* Keeps text from stretching too wide */
      }

      #chart-container {
        pointer-events: all !important;
      }
    </style>
  `;
}
function _chart_complete2(world,html,d3,cities,$0,drafting,$1,allData,syncToGoogle,alert,topojson,colorScale)
{
  if (!world) return html`Waiting for world data...`;
  
  // --- CONFIGURATION ---
  const maxK = 150.0; // Change this to set your maximum zoom level
  // const width = window.innerWidth;
  // const height = window.innerHeight - 80;
  // const scaleWidth = (width - 40) / (2 * Math.PI); // 40px padding
  // const scaleHeight = (height - 40) / Math.PI;
  // const dynamicBaseScale = Math.min(scaleWidth, scaleHeight) * 0.2;

  // 1. Use a more reliable width/height for embedded notebooks
  const width = document.body.clientWidth || window.innerWidth;
  const height = (window.innerHeight) || 600;

  // 2. Standard D3 scaling logic:
  // The 0.9 provides a 10% safety margin so it doesn't touch the edges
  const dynamicBaseScale = Math.min(width, height) / 2 / Math.PI * 1.7;

  // 1. Setup Persistent State
  const state = (this && this.value) ? this.value : { 
    rotation: [-10, -51], 
    k: 1.0 
  };

  const slider = { x: 20, y: height-20, width: 200, height: 20 };

  const dpr = window.devicePixelRatio || 1;
  
  const container = d3.create("div")
      .attr("id", "chart-container")
      .style("position", "fixed")
      .style("top", "0")
      .style("left", "0")
      .style("width", "100vw")
      .style("height", "100vh")
      .style("z-index", "100") // Higher number brings it to the front
      .style("pointer-events", "none") // Important: allows clicking through to the title
      .style("background", "transparent"); // Ensure it doesn't have a solid color

  // --- Search UI (Inside Canvas) ---
  const searchContainer = container.append("div")
    .style("position", "absolute")
    .style("top", "15px")
    .style("right", "15px")
    .style("z-index", "1001");

  // Prevent map clicks when interacting with the search box
  searchContainer.on("click", (event) => event.stopPropagation());
  searchContainer.on("dblclick", (event) => event.stopPropagation());
  searchContainer.on("wheel", (event) => event.stopPropagation());

  const searchInput = searchContainer.append("input")
    .attr("type", "text")
    .attr("placeholder", "🔍 Search city...")
    .style("padding", "8px 12px")
    .style("border-radius", "20px")
    .style("border", "1px solid #ccc")
    .style("box-shadow", "0 2px 6px rgba(0,0,0,0.1)")
    .style("width", "180px")
    .style("outline", "none");

  const resultsList = searchContainer.append("div")
    .style("position", "absolute")
    .style("top", "40px")
    .style("right", "0")
    .style("width", "220px")
    .style("background", "white")
    .style("border", "1px solid #ddd")
    .style("border-radius", "8px")
    .style("max-height", "200px")
    .style("overflow-y", "auto")
    .style("display", "none"); // Hidden by default

// --- Search Logic ---
  searchInput.on("input", function(event) {
    const value = event.target.value.toLowerCase().trim();
    
    if (!cities || cities.length === 0) return;

    if (value.length < 2) {
      resultsList.style("display", "none");
      return;
    }

    // Use city_ascii or name depending on your CSV structure
    const matches = cities
      .filter(d => (d.name || d.city_ascii || "").toLowerCase().includes(value))
      .sort((a, b) => b.population - a.population)
      .slice(0, 6);

    if (matches.length > 0) {
      // CRITICAL: Make the list visible
      resultsList.style("display", "block").html(""); 
      
      matches.forEach(city => {
        const item = resultsList.append("div")
          .style("padding", "10px 12px")
          .style("cursor", "pointer")
          .style("border-bottom", "1px solid #eee")
          .style("font-size", "13px")
          .style("background", "white") // Ensure visibility
          .style("color", "#333")
          .html(`<strong>${city.name}</strong> <small style="color: #888;">${city.admin || ''}</small>`);

        // Change background on hover
        item.on("mouseover", function() { d3.select(this).style("background", "#f0f7ff"); });
        item.on("mouseout", function() { d3.select(this).style("background", "white"); });

item.on("click", () => {
  // 1. Move the map to the city
  state.rotation = [-city.geo[0], -city.geo[1]];
  state.k = 8.0; 
  projection.rotate(state.rotation).scale(dynamicBaseScale * state.k);
  
  // Sync the zoom behavior
  canvasEl.property("__zoom", d3.zoomIdentity.scale(state.k));

  // 2. Reset Search UI
  searchInput.property("value", "");
  resultsList.style("display", "none");
  render();

  // 3. Trigger the Year Popup at the center of the screen
  // Since we just rotated the city to the center, we open the popup there.
  const centerX = width / 2;
  const centerY = height / 2; // Your projection's vertical center
  
  showYearPopupForSearch(centerX, centerY, city);
});
      });
    } else {
      resultsList.style("display", "none");
    }
  });

  const canvas = container.append("canvas")
    .attr("width", width * dpr)   // Actual pixels (High DPI)
    .attr("height", height * dpr) // Actual pixels (High DPI)
    .style("width", `${width}px`)  // Display size (CSS)
    .style("height", `${height}px`) // Display size (CSS)
    .style("position", "absolute");

  const context = canvas.node().getContext("2d");
  context.scale(dpr, dpr);


  const yOffset = 0; // Adjust this number until the sphere sits perfectly
  // 2. Projection Setup
  let projection = d3.geoMollweide()
    .scale(dynamicBaseScale * state.k) 
    .translate([width / 2, height / 2 + yOffset])
    .rotate(state.rotation);

  // --- UI Components ---
  const popup = container.append("div")
    .style("position", "absolute")
    .style("display", "none")
    .style("background", "white")
    .style("padding", "12px")
    .style("border-radius", "8px")
    .style("box-shadow", "0 4px 15px rgba(0,0,0,0.2)")
    .style("z-index", "1000")
    .style("pointer-events", "auto");

  // --- Helper: Save current edit ---
  function showYearPopupForSearch(mx, my, city) {
  popup.style("display", "block")
    .style("left", `${mx + 15}px`)
    .style("top", `${my - 20}px`)
    .html(`
      <div style="margin-bottom:8px"><strong>Confirm Year</strong></div>
      <div style="font-size:11px; color:#666; margin-bottom:5px;">Adding: ${city.name}</div>
      <input type="number" id="search-year" value="2026" style="width:60px; margin-bottom:10px;">
      <br>
      <button id="btn-confirm-search" style="width:100%; background:#007bff; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer;">Add to Trip</button>
      <button id="btn-cancel-search" style="width:100%; margin-top:4px; background:none; border:none; color:gray; font-size:11px; cursor:pointer">Cancel</button>
    `);

  // Confirm Button
  popup.select("#btn-confirm-search").on("click", (e) => {
    e.stopPropagation();
    const year = +popup.select("#search-year").property("value");
    
    // Add point to drafting
    $0.value.points = [...drafting.points, { geo: city.geo, year: year }];
    
    popup.style("display", "none");
    render();
  });

  // Cancel Button
  popup.select("#btn-cancel-search").on("click", (e) => {
    e.stopPropagation();
    popup.style("display", "none");
  });
}
  
  const finalizeCurrentLine = async (tripName, currentGeo = null, currentYear = null) => {
    let finalPoints = [...drafting.points];
    if (currentGeo && currentYear) {
      finalPoints.push({ geo: currentGeo, year: currentYear });
    }
    
    if (finalPoints.length < 2) return; 
  
    const newLinks = [];
    for (let i = 0; i < finalPoints.length - 1; i++) {
      newLinks.push({
        source: finalPoints[i].geo,
        target: finalPoints[i+1].geo,
        year: finalPoints[i+1].year, // This can now be your [year0, year1] array
        name: tripName
      });
    }
  
    // Update the data
    $1.value = { 
      links: [...allData.links, ...newLinks], 
      points: [...allData.points, ...finalPoints.map(d => d.geo)] 
    };

    // 3. SYNC TO GOOGLE SHEETS
    try {
      console.log("Syncing to Google...");
      await syncToGoogle(newLinks);
      console.log("Google Sync Complete");
    } catch (err) {
      console.error("Google Sync Failed", err);
      alert("Map updated locally, but failed to save to Google Sheets.");
    }
    
    $0.value = { points: [] };
  
    render();
  };

  const drawColorbar = (ctx) => {
    const years = [
      ...allData.links.map(d => d.year), 
      ...drafting.points.map(d => d.year)
    ].flat().filter(d => d != null);
    if (years.length === 0) return;

    const minYear = d3.min(years);
    const maxYear = d3.max(years);
    const barWidth = 200, barHeight = 15;
    const x = width - barWidth - 40, y = height - 40;

    const gradient = ctx.createLinearGradient(x, 0, x + barWidth, 0);
    d3.range(0, 1.1, 0.1).forEach(t => gradient.addColorStop(t, d3.interpolateViridis(t)));

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(minYear, x, y + barHeight + 15);
    ctx.fillText(maxYear, x + barWidth, y + barHeight + 15);
    ctx.textAlign = "right";
    ctx.fillText("Year Progression", x + barWidth, y - 8);
  };

  const drawDynamicCities = (ctx) => {
    if (!cities || cities.length === 0) return;
    ctx.save();
    ctx.textBaseline = "middle";

    cities.forEach(city => {
      const p = projection(city.geo);
      if (!p || p[0] < 0 || p[0] > width || p[1] < 0 || p[1] > height) {
        return;
      }
      let kThreshold, isImportant = false;
      if (city.isCapital || city.population >= 2000000) {
        kThreshold = 1.5; isImportant = true;
      } else if (city.population >= 200000) {
        kThreshold = 6.0; 
      } else if (city.population >= 100000) {
        kThreshold = 12.0; 
      } else if (city.population >= 50000) {
        kThreshold = 20.0; 
      } else if (city.population >= 20000) {
        kThreshold = 40.0; 
      } else {
        kThreshold = 90.0; 
      }

      // Calculate opacity based on zoom level
      const zoomOpacity = Math.max(0, Math.min(1, (state.k - kThreshold) / 2.0));
      if (zoomOpacity <= 0) return;

      ctx.globalAlpha = zoomOpacity;
      const radius = isImportant ? 3.5 : 1.5;
      ctx.beginPath();
      ctx.arc(p[0], p[1], radius, 0, 2 * Math.PI);
      ctx.fillStyle = city.isCapital ? "#e63946" : (isImportant ? "#1d3557" : "#457b9d");
      ctx.fill();

      if (state.k > kThreshold + 1) {
        ctx.font = isImportant ? "bold 11px sans-serif" : "10px sans-serif";
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 3;
        ctx.strokeText(city.name, p[0] + radius + 3, p[1]);
        ctx.fillStyle = "#1d3557";
        ctx.fillText(city.name, p[0] + radius + 3, p[1]);
      }
    });
    ctx.restore();
  };

  function drawKSlider(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "#ccc"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.moveTo(slider.x, slider.y); ctx.lineTo(slider.x + slider.width, slider.y);
    ctx.stroke();

    // Use maxK for the handle math
    const handleX = slider.x + ((state.k - 1) / (maxK - 1)) * slider.width;
    ctx.beginPath(); ctx.arc(handleX, slider.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#1d3557"; ctx.fill();
    ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = "#1d3557"; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`Zoom Level: ${state.k.toFixed(2)}x`, slider.x, slider.y - 15);
    ctx.restore();
  }

  function render() {
    const path = d3.geoPath(projection, context);
    context.clearRect(0, 0, width, height);
    
    context.save();
    // 1. Draw Base Map
    context.beginPath(); 
    path({type: "Sphere"});
    context.fillStyle = "#f8f9fa"; 
    context.fill();

    // 2. Map Content
    context.beginPath(); 
    path(topojson.feature(world, world.objects.countries));
    context.fillStyle = "#fff"; context.fill();
    context.strokeStyle = "#ddd"; context.stroke();

    if (Array.isArray(cities)) drawDynamicCities(context);

    // Saved Traces
    allData.links.forEach(l => {
    context.beginPath();
    const pSource = projection(l.source);
    const pTarget = projection(l.target);
    if (pSource && pTarget) {
      const year0 = Array.isArray(l.year) ? l.year[0] : l.year;
      const year1 = Array.isArray(l.year) ? l.year[1] : l.year;
      // Create a gradient along the line segment
      const grad = context.createLinearGradient(pSource[0], pSource[1], pTarget[0], pTarget[1]);
      grad.addColorStop(0, colorScale(year0));
      grad.addColorStop(1, colorScale(year1));
      context.strokeStyle = grad;
    } else {
      // Fallback if coordinates are weird or link is partially off-globe
      context.strokeStyle = colorScale(Array.isArray(l.year) ? l.year[0] : l.year);
    }
  
    context.lineWidth = 2;
    path({type: "LineString", coordinates: [l.source, l.target]});
    context.stroke();
  });

    // Draft Trace
    if (drafting.points.length > 0) {
      const coordsOnly = drafting.points.map(d => d.geo);
      context.beginPath();
      context.strokeStyle = "#007bff";
      context.setLineDash([4, 4]);
      if (coordsOnly.length > 1) path({type: "LineString", coordinates: coordsOnly});
      context.stroke();
      context.setLineDash([]);

      drafting.points.forEach(p => {
        const c = projection(p.geo);
        if (c) {
          context.beginPath();
          const displayYear = Array.isArray(p.year) ? p.year[0] : p.year;
          context.arc(c[0], c[1], 5, 0, 2 * Math.PI);
          context.fillStyle = colorScale(displayYear);
          context.fill();
          context.strokeStyle = "white";
          context.stroke();
        }
      });
    }

    drawKSlider(context);
    drawColorbar(context);
  }
let isDraggingSlider = false;
  // 1. Define the Zoom Behavior
const zoomHandler = d3.zoom()
  .scaleExtent([1, maxK])
  .filter((event) => {
    // Stop D3 zoom from triggering on a single-finger drag (rotation)
    // Only allow mouse wheel or multi-touch pinch
    return event.type === 'wheel' || (event.touches && event.touches.length > 1);
  })
  .on("zoom", (event) => {
    if (isDraggingSlider) return;
    state.k = event.transform.k;
    projection.scale(dynamicBaseScale * state.k);
    render();
  });

  // 2. Attach Zoom to Canvas (and disable double-click zoom if preferred)
  const canvasEl = d3.select(canvas.node());
  canvasEl.call(zoomHandler)
    .on("dblclick.zoom", null); // Optional: stops jumpy zooming on double click

  // --- FORCE SCROLL LOCK ---
  const canvasRaw = canvas.node();
  
  // 1. Listen for the 'wheel' event directly on the DOM element
  // 2. Use { passive: false } to allow preventDefault()
  // 3. Use 'true' as the third argument (Capture Phase) to stop D3 from seeing it first if needed
  canvasRaw.addEventListener('wheel', (event) => {
    event.preventDefault();
    event.stopPropagation();
  }, { passive: false });
  
  // Also prevent touch-scrolling on mobile
  canvasRaw.style.touchAction = 'none';
  
  // 3. Update your Slider logic inside the Drag Handler
  // We need to tell the zoomHandler to update its internal scale 
  // when you manually move the slider.
// 3. Update the Drag Handler to sync back to the Zoom state
const dragHandler = d3.drag()
  .on("start", (event) => {
    isDraggingSlider = (
      event.y > slider.y - 20 && event.y < slider.y + 20 && 
      event.x > slider.x - 10 && event.x < slider.x + slider.width + 10
    );
  })
  .on("drag", (event) => {
    if (isDraggingSlider) {
      let pct = Math.max(0, Math.min(1, (event.x - slider.x) / slider.width));
      state.k = 1.0 + pct * (maxK - 1.0);
      
      // CRITICAL: Keep d3.zoom in sync with the slider
      canvasEl.property("__zoom", d3.zoomIdentity.scale(state.k));
      
      projection.scale(dynamicBaseScale * state.k);
    } else {
      // Rotation logic
      state.rotation[0] += event.dx * (0.4 / state.k);
      state.rotation[1] -= event.dy * (0.4 / state.k);
      projection.rotate(state.rotation);
    }
    render();
  })
  .on("end", () => { isDraggingSlider = false; });

canvasEl.call(dragHandler);

  // --- Events ---
  let clickTimer = null;

  container.on("click", (event) => {
    if (event.target !== canvas.node()) return;

    // If a second click happens within 250ms, cancel the first one
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      return; 
    }

    // Capture the mouse position immediately
    const [mx, my] = d3.pointer(event);
    const geo = projection.invert([mx, my]);
    if (!geo || isNaN(geo[0])) return;

    clickTimer = setTimeout(() => {
      popup.style("display", "block");
      
      // 1. Set HTML content
      popup.html(`
        <div style="margin-bottom:8px"><b>Point #${drafting.points.length + 1}</b></div>
        Year: <input type="number" id="in-year" value="2026" style="width:60px; margin-bottom:10px;"><br>
        <button id="btn-add-point" style="width:100%; margin-bottom:4px; font-weight:bold;">Add Point</button>
        ${drafting.points.length > 0 ? `
          <button id="btn-undo-point" style="width:100%; margin-bottom:4px; background:#ffc107; border:1px solid #e0a800; border-radius:4px; padding:4px; cursor:pointer;">↺ Undo Last Point</button>
        ` : ''}
        ${drafting.points.length >= 1 ? `
          <hr style="border:0; border-top:1px solid #eee">
          <input type="text" id="in-name" placeholder="Your Name" style="width:100%; margin-bottom:4px"><br>
          <button id="btn-save-all" style="width:100%; background:#28a745; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer;">Save & Finish</button>
        ` : ''}
        <button id="btn-cancel" style="width:100%; margin-top:4px; background:none; border:none; color:gray; font-size:11px; cursor:pointer">Cancel Trace</button>
      `);

      // 2. Position Clamping (Inside the timer)
      const pNode = popup.node();
      const padding = 10;
      let posX = mx + padding;
      let posY = my + padding;
      
      if (posX + pNode.offsetWidth > width) posX = mx - pNode.offsetWidth - padding;
      if (posY + pNode.offsetHeight > height) posY = my - pNode.offsetHeight - padding;
      
      popup.style("left", `${posX}px`).style("top", `${posY}px`);

      // 3. Button Listeners (Inside the timer)
      popup.select("#btn-add-point").on("click", (e) => {
        e.stopPropagation();
        const year = +popup.select("#in-year").property("value");
        $0.value.points = [...drafting.points, { geo, year }];
        popup.style("display", "none");
        render();
      });

      popup.select("#btn-undo-point").on("click", (e) => {
        e.stopPropagation();
        $0.value.points = drafting.points.slice(0, -1);
        popup.style("display", "none");
        render();
      });

      popup.select("#btn-save-all").on("click", (e) => {
        e.stopPropagation();
        const d = new Date();
        const timestamp = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}_${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}`;
        const name = popup.select("#in-name").property("value") || `Unnamed Trace ${timestamp}`;
        const year = +popup.select("#in-year").property("value");
        finalizeCurrentLine(name, geo, year); 
        popup.style("display", "none");
      });

      popup.select("#btn-cancel").on("click", (e) => {
        e.stopPropagation();
        $0.value = { points: [] };
        popup.style("display", "none");
        render();
      });

      clickTimer = null; 
    }, 250);
  });

  // --- Double Click Handler ---
  canvas.on("dblclick", (event) => {
    event.preventDefault();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    
    if (drafting.points.length < 2) return;

    popup.style("display", "block").html(`
      <div style="margin-bottom:8px"><b>Quick Save Trace?</b></div>
      <input type="text" id="db-name" placeholder="Your Name" style="width:100%; margin-bottom:8px;">
      <button id="db-save" style="width:100%; background:#28a745; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;">Save & Finish</button>
      <button id="db-cancel" style="width:100%; margin-top:5px; background:none; border:none; color:gray; font-size:11px; cursor:pointer;">Discard Draft</button>
    `);

    // (Add similar clamping logic here for dblclick popup if needed)

    popup.select("#db-save").on("click", (e) => {
      e.stopPropagation();
      const d = new Date();
      const timestamp = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}_${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}`;
      const name = popup.select("#db-name").property("value") || `Unnamed Trace ${timestamp}`;
      finalizeCurrentLine(name);
      popup.style("display", "none");
    });

    popup.select("#db-cancel").on("click", (e) => {
      e.stopPropagation();
      $0.value = { points: [] };
      popup.style("display", "none");
      render();
    });
  });

  render();
  container.node().value = state;
  return container.node();
}


function _savedTable(allData,html,d3)
{
  // If no data exists yet, show a placeholder
  if (allData.links.length === 0) return html`<em>No traces saved yet. Use the map to create one!</em>`;

  // Group links by their "name" property
  const trips = d3.groups(allData.links, d => d.name);

  return html`<table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 14px;">
    <thead>
      <tr style="background: #f4f4f4; border-bottom: 2px solid #ddd; text-align: left;">
        <th style="padding: 10px;">Trace Name</th>
        <th style="padding: 10px;">Segments</th>
        <th style="padding: 10px;">Coordinates (Start → End)</th>
      </tr>
    </thead>
    <tbody>
      ${trips.map(([name, links]) => {
        const start = links[0].source;
        const end = links[links.length - 1].target;
        return html`
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #e63946;">${name}</td>
            <td style="padding: 10px;">${links.length} segments</td>
            <td style="padding: 10px; font-family: monospace; font-size: 11px; color: #666;">
              [${start[0].toFixed(2)}, ${start[1].toFixed(2)}] → [${end[0].toFixed(2)}, ${end[1].toFixed(2)}]
            </td>
          </tr>
        `;
      })}
    </tbody>
  </table>`;
}


function _5(DOM,allData){return(
DOM.download(
  new Blob([JSON.stringify(allData, null, 2)], {type: "application/json"}), 
  "traces.json", 
  "Download Trace Data"
)
)}

function _allData(initialDataFromGoogle){return(
initialDataFromGoogle
)}

function _drafting(){return(
{ points: [], year: null, active: false }
)}

function _d3(require){return(
require("d3@7", "d3-tile@1", "d3-geo@3", "d3-geo-projection@4", "d3-selection@3")
)}

async function _world(){return(
(await fetch("https://unpkg.com/world-atlas@2.0.2/countries-110m.json")).json()
)}

function _cities(FileAttachment){return(
FileAttachment("worldcities.csv").csv({typed: true}).then(data => 
  data.map(d => ({
    name: d.city_ascii,
    geo: [+d.lng, +d.lat], // ensures [longitude, latitude]
    population: +d.population || 0,
    isCapital: d.capital === "primary",
    admin: d.admin_name
  }))
)
)}

function _colorScale(allData,d3)
{
  const years = [
  ...allData.links.map(d => d.year)
  ].flat().filter(d => d != null);
  
  // 2. Calculate bounds with sensible defaults
  const minYear = d3.min(years) || 1900;
  const maxYear = d3.max(years) || 2040;
  
  return d3.scaleSequential()
    .domain([minYear, maxYear])
    .interpolator(d3.interpolateViridis);
}


function _googleSheetUrl(){return(
"https://script.google.com/macros/s/AKfycbzgP0H6l1IHVg4bqNSG2jwfy6TzJ8KwzokT_M4Op5w6P3rFixTaZd3pkmnCRlOrS6fN/exec"
)}

function _syncToGoogle(googleSheetUrl){return(
async function syncToGoogle(newLinks) {
  const rows = newLinks.map(l => [
    l.name,
    Array.isArray(l.year) ? l.year[0] : l.year,
    Array.isArray(l.year) ? l.year[1] : l.year,
    l.source[0], l.source[1],
    l.target[0], l.target[1]
  ]);

  return fetch(googleSheetUrl, {
    method: "POST",
    body: JSON.stringify(rows)
  });
}
)}

async function _initialDataFromGoogle(googleSheetUrl)
{
  const response = await fetch(googleSheetUrl);
  const links = await response.json();
  
  // Construct the allData structure
  return {
    links: links,
    // Extract unique points from sources and targets
    points: [...new Set(links.flatMap(l => [l.source.join(','), l.target.join(',')]))]
             .map(s => s.split(',').map(Number))
  };
}


export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["worldcities.csv", {url: new URL("./files/data.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer("hideUI_Robust")).define("hideUI_Robust", ["html"], _hideUI_Robust);
  main.variable(observer()).define(["html"], _2);
  main.variable(observer("chart_complete2")).define("chart_complete2", ["world","html","d3","cities","mutable drafting","drafting","mutable allData","allData","syncToGoogle","alert","topojson","colorScale"], _chart_complete2);
  main.variable(observer("viewof savedTable")).define("viewof savedTable", ["allData","html","d3"], _savedTable);
  main.variable(observer("savedTable")).define("savedTable", ["Generators", "viewof savedTable"], (G, _) => G.input(_));
  main.variable(observer()).define(["DOM","allData"], _5);
  main.define("initial allData", ["initialDataFromGoogle"], _allData);
  main.variable(observer("mutable allData")).define("mutable allData", ["Mutable", "initial allData"], (M, _) => new M(_));
  main.variable(observer("allData")).define("allData", ["mutable allData"], _ => _.generator);
  main.define("initial drafting", _drafting);
  main.variable(observer("mutable drafting")).define("mutable drafting", ["Mutable", "initial drafting"], (M, _) => new M(_));
  main.variable(observer("drafting")).define("drafting", ["mutable drafting"], _ => _.generator);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("world")).define("world", _world);
  main.variable(observer("cities")).define("cities", ["FileAttachment"], _cities);
  main.variable(observer("colorScale")).define("colorScale", ["allData","d3"], _colorScale);
  main.variable(observer("googleSheetUrl")).define("googleSheetUrl", _googleSheetUrl);
  main.variable(observer("syncToGoogle")).define("syncToGoogle", ["googleSheetUrl"], _syncToGoogle);
  main.variable(observer("initialDataFromGoogle")).define("initialDataFromGoogle", ["googleSheetUrl"], _initialDataFromGoogle);
  return main;
}
