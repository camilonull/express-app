let limitedRecsGlobal = [];
let rentabilidadOrdenadoGlobal = [];
let crecimientoOrdenadoGlobal = [];
//const baseClienteBlobUrl = "https://almacenamientoexpress.blob.core.windows.net/mis-archivos/BaseCliente.csv?sp=r&st=2025-04-28T00:23:15Z&se=2025-08-20T08:23:15Z&sv=2024-11-04&sr=b&sig=TBZo7fBfgulDh1giU5CVVIInQr5C6pXBHRQ%2FR0bkiuM%3D";
const baseCliCCBlobUrl = "https://almacenamientoexpress.blob.core.windows.net/mis-archivos/BaseCliCC.csv?sp=r&st=2025-04-28T00:26:06Z&se=2025-08-20T08:26:06Z&sv=2024-11-04&sr=b&sig=r%2FYtIJNBwIRe8g5jZAAP8BA2wZnAbhgk%2BgvfugcRthE%3D";


function clearLog() {
  const div = document.getElementById('logBody');
  div.innerHTML = '';
}

async function descargarCSVDesdeBlob(blobUrl) {
  showProgress();

  const response = await fetch(blobUrl);
  const reader = response.body.getReader();
  const contentLength = +response.headers.get('Content-Length');

  let receivedLength = 0;
  let chunks = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    const percent = Math.floor((receivedLength / contentLength) * 100);
    updateProgress(percent);
  }

  // Combinar todos los chunks
  let blob = new Blob(chunks);
  let text = await blob.text();

  hideProgress();

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: results => resolve(results.data),
      error: err => reject(err)
    });
  });
}


// Función mejorada para mostrar mensajes
function log(message) {
  const div = document.getElementById('logBody');
  const time = new Date().toLocaleTimeString('es-CO', { hour12: false });
  
  const entry = document.createElement('div');
  entry.className = 'log-entry mb-2';

  entry.innerHTML = `
  <small class="text-muted">[${time}]</small> 
  <span style="font-size: 1rem;">${message}</span>
`;

  div.appendChild(entry);
  div.scrollTop = div.scrollHeight;
}


function actualizarInputs(cliente1Max, cliente0Max) {
  // Actualizar labels
  document.querySelector('label[for="rentabilidadInput"]').innerText = `Cantidad Rentabilidad (Máx: ${cliente1Max})`;
  document.querySelector('label[for="crecimientoInput"]').innerText = `Cantidad Crecimiento (Máx: ${cliente0Max})`;

  // Actualizar atributos de los inputs
  const rentabilidadInput = document.getElementById('rentabilidadInput');
  rentabilidadInput.max = cliente1Max;
  rentabilidadInput.value = 0; // Opcional: poner el valor por defecto igual al máximo

  const crecimientoInput = document.getElementById('crecimientoInput');
  crecimientoInput.max = cliente0Max;
  crecimientoInput.value = 0; // Opcional
}

function showSpinner() {
  document.getElementById('spinner').classList.remove('d-none');
}

function hideSpinner() {
  document.getElementById('spinner').classList.add('d-none');
}
function showInputsFilter() {
  document.getElementById('inputsFilter').classList.remove('d-none');
}
function limitRecommendations(recs) {
  // Filtrar por tipo de cliente
  const cliente1Recs = recs.filter(rec => rec.Cliente === 1);
  const cliente0Recs = recs.filter(rec => rec.Cliente === 0);

  // Definir máximos
  const maxCliente1 = Math.min(cliente1Recs.length, 20000);
  const maxCliente0 = Math.min(cliente0Recs.length, Math.floor(maxCliente1 * 0.25)); // 20% de total (80/20 => 20/80 = 0.25)
  // Actualizas los inputs
  actualizarInputs(maxCliente1, maxCliente0);
  // Cortar la lista a los límites
  const finalCliente1 = cliente1Recs.slice(0, maxCliente1);
  const finalCliente0 = cliente0Recs.slice(0, maxCliente0);

  // Unir las recomendaciones
  const finalRecs = finalCliente1.concat(finalCliente0);

  return finalRecs;
}

function showElements() {
  document.getElementById('tableHeader').classList.remove('d-none');
  document.getElementById('tablaRegistros').classList.remove('d-none');
  document.getElementById('tableResumen').classList.remove('d-none');
  document.getElementById('titleTopCIIU').classList.remove('d-none');
  document.getElementById('tableTopCIIU').classList.remove('d-none');
}

function hideElements() {
  document.getElementById('tableHeader').classList.add('d-none');
  document.getElementById('tablaRegistros').classList.add('d-none');
  document.getElementById('tableResumen').classList.add('d-none');
  document.getElementById('titleTopCIIU').classList.add('d-none');
  document.getElementById('tableTopCIIU').classList.add('d-none');
}
let isProcessing = false;

function updateCSV() {
  if (isProcessing) return;
  isProcessing = true;

  const rentabilidadCount = parseInt(document.getElementById('rentabilidadInput').value, 10) || 0;
  const crecimientoCount = parseInt(document.getElementById('crecimientoInput').value, 10) || 0;

  // Ya tenemos las listas listas y ordenadas:
  const rentabilidadRecs = rentabilidadOrdenadoGlobal.slice(0, rentabilidadCount);
  const crecimientoRecs = crecimientoOrdenadoGlobal.slice(0, crecimientoCount);

  let finalRecs = [...rentabilidadRecs, ...crecimientoRecs];
  finalRecs = finalRecs.sort((a, b) => a.Distancia - b.Distancia);

  renderTabla(finalRecs);
  mostrarResumen(calcularResumen(finalRecs));
  topCIIU(finalRecs);
  showElements();

  const csv = Papa.unparse(finalRecs, {
    delimiter: ";",
    quotes: false,
    skipEmptyLines: true,
    format: "csv",
    transform: (value, field) => {
      if (typeof value === "number") {
        return value.toString().replace(".", ",");
      }
      return value;
    }
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const downloadBtn = document.getElementById('downloadBtn');
  downloadBtn.style.display = 'block';
  downloadBtn.href = url;
  downloadBtn.download = `recomendaciones-${new Date().toISOString().slice(0, 10)}.csv`;
  
  isProcessing = false;
}


// Leer Excel usando SheetJS
function readExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const key = Object.keys(json[0])[0];
      const arr = json.map(r => r[key].toString());
      resolve(arr);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Cargar CSV usando PapaParse
function loadCSV(url) {
  return new Promise(resolve => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: results => {
        const clean = results.data.filter(row => row?.IDENTIFICACION);
        resolve(clean);
      }
    });
  });
}

function calcularResumen(data) {
  const total = data.length;

  const rentabilizar = data.filter(rec => rec.Cliente === 1);
  const crecimiento = data.filter(rec => rec.Cliente === 0);

  const resumen = {
    rentabilizar: {
      cantidad: rentabilizar.length,
      porcentaje: (rentabilizar.length / total) * 100,
      patrimonioPromedio: rentabilizar.reduce((acc, r) => acc + parseFloat(r.Patrimonio), 0) / rentabilizar.length || 0,
      personalPromedio: rentabilizar.reduce((acc, r) => acc + parseFloat(r.Personal), 0) / rentabilizar.length || 0,
    },
    crecimiento: {
      cantidad: crecimiento.length,
      porcentaje: (crecimiento.length / total) * 100,
      patrimonioPromedio: crecimiento.reduce((acc, r) => acc + parseFloat(r.Patrimonio), 0) / crecimiento.length || 0,
      personalPromedio: crecimiento.reduce((acc, r) => acc + parseFloat(r.Personal), 0) / crecimiento.length || 0,
    }
  };

  return resumen;
}

// Para mostrarlo en HTML
function mostrarResumen(resumen) {
  document.getElementById('rentabilizarResumen').innerHTML = `
    <h5>Rentabilizar</h5>
    <p><strong>Cantidad Empresas:</strong> ${resumen.rentabilizar.cantidad.toLocaleString()} (${resumen.rentabilizar.porcentaje.toFixed(1)}%)</p>
    <p><strong>Promedio Patrimonio:</strong> ${resumen.rentabilizar.patrimonioPromedio.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}</p>
    <p><strong>Promedio Personal:</strong> ${resumen.rentabilizar.personalPromedio.toFixed(0)} empleados</p>
  `;

  document.getElementById('crecimientoResumen').innerHTML = `
    <h5>Crecimiento</h5>
    <p><strong>Cantidad Empresas:</strong> ${resumen.crecimiento.cantidad.toLocaleString()} (${resumen.crecimiento.porcentaje.toFixed(1)}%)</p>
    <p><strong>Promedio Patrimonio:</strong> ${resumen.crecimiento.patrimonioPromedio.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}</p>
    <p><strong>Promedio Personal:</strong> ${resumen.crecimiento.personalPromedio.toFixed(0)} empleados</p>
  `;
}
function topCIIU(data) {
  const counts = {};

  data.forEach(rec => {
    if (!counts[rec.Codigo_CIIU]) {
      counts[rec.Codigo_CIIU] = { count: 0, descripcion: rec.Descripcion_CIIU };
    }
    counts[rec.Codigo_CIIU].count += 1;
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([codigo, info]) => ({
      Codigo_CIIU: codigo,
      Descripcion_CIIU: info.descripcion,
      Cantidad: info.count
    }));

    if ($.fn.DataTable.isDataTable('#tableTopCIIU')) {
      $('#tableTopCIIU').DataTable().clear().destroy();
    }

  const tablaTop = document.getElementById('topCiiuTablaBody');
  tablaTop.innerHTML = '';
  sorted.forEach(row => {
    const fila = `
      <tr>
        <td>${row.Codigo_CIIU}</td>
        <td>${row.Descripcion_CIIU}</td>
        <td>${row.Cantidad.toLocaleString()}</td>
      </tr>
    `;
    tablaTop.innerHTML += fila;
  });

  // Volver a activar DataTable
  $('#tableTopCIIU').DataTable({
    scrollY: "250px",
    pageLength: 5,
    scrollX: true,
    language: {
      url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json"
    }
  });
}

function renderTabla(registros) {
  const tablaBody = document.getElementById('tablaRegistrosBody');
  
  // Si ya existe un DataTable en la tabla, lo destruimos
  if ($.fn.DataTable.isDataTable('#miTabla')) {
    $('#miTabla').DataTable().clear().destroy();
  }

  tablaBody.innerHTML = '';

  const registrosValidos = registros.filter(rec =>
    rec.Identificacion && rec.EMPRESA && rec.Tipo_Documento && rec.Patrimonio && rec.Personal
  );

  const filasHTML = registrosValidos.slice(0, 200).map(rec => `
    <tr>
      <td>${rec.Identificacion}</td>
      <td>${rec.EMPRESA}</td>
      <td>${rec.Tipo_Documento}</td>
      <td>${parseFloat(rec.Patrimonio).toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}</td>
      <td>${parseInt(rec.Personal).toLocaleString('es-CO')}</td>
      <td>${rec.Codigo_CIIU}</td>
      <td>${rec.Descripcion_CIIU}</td>
      <td>${rec.Cliente === 1 ? 'R' : 'C'}</td>
      <td>${parseFloat(rec.Distancia).toFixed(6)}</td>
      <td>${rec.Identificacion_cliente}</td>
      <td>${rec.EMPRESA_cliente}</td>
      <td>${parseFloat(rec.Patrimonio_cliente).toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}</td>
      <td>${parseInt(rec.Personal_cliente).toLocaleString('es-CO')}</td>
      <td>${rec.Codigo_CIIU_Cliente}</td>
      <td>${rec.Descripcion_CIIU_Cliente}</td>
    </tr>
  `).join('');

  tablaBody.innerHTML = filasHTML;

  // Volver a activar DataTable
  $('#miTabla').DataTable({
    scrollY: "300px",
    scrollX: true,
    scrollCollapse: true,
    paging: true,
    pageLength: 10,
    lengthMenu: [5, 10, 25, 50, 100],
    language: {
      url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json"
    }
  });
  
}



// Estadísticos robustos
function computeMedian(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function computeIQR(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const q1i = (s.length + 1) * 0.25 - 1;
  const q3i = (s.length + 1) * 0.75 - 1;

  function val(i) {
    if (i % 1 === 0) return s[i];
    const lo = Math.floor(i), hi = Math.ceil(i);
    return (s[lo] + s[hi]) / 2;
  }
  return val(q3i) - val(q1i);
}
function robustScale(data, cols, stats = null) {
  if (!stats) {
    stats = {};
    cols.forEach(col => {
      const arr = data.map(r => +r[col]);
      const med = computeMedian(arr);
      const iqr = computeIQR(arr) || 1;
      stats[col] = { med, iqr };
    });
  }
  return data.map(r => {
    const out = {};
    cols.forEach(col => {
      out[col] = (r[col] - stats[col].med) / stats[col].iqr;
    });
    return out;
  });
}

function computeRecommendations(basePrim, baseSec, weights) {
  const cols = ['Patrimonio', 'Personal'];

  // 1. Calcula los stats usando baseSec
  const stats = {};
  cols.forEach(col => {
    const arr = baseSec.map(r => +r[col]);
    const med = computeMedian(arr);
    const iqr = computeIQR(arr) || 1;
    stats[col] = { med, iqr };
  });

  // 2. Usa esos stats para escalar ambas bases
  const scaledSec = robustScale(baseSec, cols, stats).map(v => [v.Patrimonio, v.Personal]);
  const scaledPrim = robustScale(basePrim, cols, stats).map(v => [v.Patrimonio, v.Personal]);

  const results = [];
  for (let i = 0; i < scaledPrim.length; i++) {
    let minDist = Infinity, minIdx = 0;
    for (let j = 0; j < scaledSec.length; j++) {
      const dist = math.distance(
        [scaledPrim[i][0] * weights[0], scaledPrim[i][1] * weights[1]],
        [scaledSec[j][0] * weights[0], scaledSec[j][1] * weights[1]]
      );
      if (dist < minDist) {
        minDist = dist;
        minIdx = j;
      }
    }
    const p = basePrim[i], s = baseSec[minIdx];
    results.push({
      Identificacion: p.IDENTIFICACION,
      EMPRESA: p.EMPRESA,
      Tipo_Documento: p.Tipo_Documento,
      Patrimonio: p.Patrimonio,
      Personal: p.Personal,
      Codigo_CIIU: p.ciiu_ccb,
      Descripcion_CIIU: p.Descripcion_CIIU,
      Cliente: p.Cliente,
      Distancia: minDist.toFixed(6),
      Identificacion_cliente: s.IDENTIFICACION,
      EMPRESA_cliente: s.EMPRESA,
      Patrimonio_cliente: s.Patrimonio,
      Personal_cliente: s.Personal,
      Codigo_CIIU_Cliente: s.ciiu_ccb,
      Descripcion_CIIU_Cliente: s.Descripcion_CIIU
    });
  }

  results.sort((a, b) => a.Distancia - b.Distancia);

  return results;
}
function showProgress() {
  const container = document.getElementById('progressContainer');
  container.classList.remove('d-none');
}

function updateProgress(percent) {
  const bar = document.getElementById('progressBar');
  bar.style.width = `${percent}%`;
  bar.setAttribute('aria-valuenow', percent);
  bar.textContent = `${percent}%`;
}

function hideProgress() {
  const container = document.getElementById('progressContainer');
  container.classList.add('d-none');
  updateProgress(0);
}



let debounceTimeout;

// Función para debounce

function debounce(func, delay) {
  clearTimeout(debounceTimeout); // Si el usuario escribió otra tecla antes del tiempo, cancela el anterior
  debounceTimeout = setTimeout(func, delay); // Programa la función para ejecutarse luego de "delay" ms
}
// Manejador del botón
document.getElementById('processBtn').addEventListener('click', async () => {
  hideElements(); // Ocultar elementos antes de procesar
  clearLog(); // Limpiar el log
  const file = document.getElementById('fileInput').files[0];
  if (!file) {
    log('❌ Error: Selecciona un archivo con NITs.');
    return;
  }

  // Mostrar spinner
  //showSpinner();

  try {
    log('🚀 Paso 1: Leyendo NITs desde Excel...');
    const nits = await readExcel(file);
    log(`✅ NITs cargados: ${nits.length}`);

    log(`📥 Paso 2: Descargando bases de datos...`);
    const basePrim = await descargarCSVDesdeBlob(baseCliCCBlobUrl);   // ⬅️ Igual aquí

    log(`📥 Paso 3: Cargando la base principal con un total de ${basePrim.length} de registros`);
    log('🔍 Filtrando NITs y valores válidos...');
    const secFiltered = basePrim.filter(r =>
      r && typeof r.IDENTIFICACION !== 'undefined' &&
      nits.includes(String(r.IDENTIFICACION).trim())
    );
    // Filtrar la base primaria por los ciiu_ccb que existen en la base secundaria
    const ciiuSec = new Set(secFiltered.map(r => r.ciiu_ccb)); // Crear un Set con los ciiu_ccb únicos de baseSec
    const primFiltered = basePrim.filter(r => ciiuSec.has(r.ciiu_ccb) && !nits.includes(String(r.IDENTIFICACION).trim()));
    log('⚙️ Paso 4: Calculando recomendaciones...');
    let recs = computeRecommendations(primFiltered, secFiltered, [0.5, 0.5]);
    // Limitar recs a 20000 registros en clientes 1 y 5000 en clientes 0
    const limitedRecs = limitRecommendations(recs);
    // Guardar listas separadas y ordenadas
    limitedRecsGlobal = limitedRecs;
    rentabilidadOrdenadoGlobal = limitedRecs.filter(r => r.Cliente === 1).sort((a, b) => a.Distancia - b.Distancia);
    crecimientoOrdenadoGlobal = limitedRecs.filter(r => r.Cliente === 0).sort((a, b) => a.Distancia - b.Distancia);

    // Eliminar la referencia a recs para liberar memoria
    recs = null;
    log(`✅ Generadas ${limitedRecs.length} recomendaciones.`);


    // Mostrar inputs de cantidad
    showInputsFilter();

    // Escuchar cambios en los inputs para exportar
    document.getElementById('rentabilidadInput').addEventListener('input', () => {
      debounce(updateCSV, 2000);
    });
    
    document.getElementById('crecimientoInput').addEventListener('input', () => {
      debounce(updateCSV, 2000);
    });
    
  } catch (error) {
    log('❌ Error inesperado: ' + error.message);
  } finally {
    // Ocultar spinner
    //hideSpinner();
  }
});
