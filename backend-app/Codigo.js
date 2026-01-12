function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Ventas Vivero')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function getInventoryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('INVENTARIO');
  
  if (sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  
  // Mapeo seguro de datos
  return data.map(row => ({
    id: String(row[0]),       
    nombre: row[1],   
    precio: Number(row[2]),
    categoria: row[3],
    imagen: row[4],   
    stock: Number(row[7])     
  })).filter(item => item.stock > 0); // Solo enviamos lo que tiene stock
}

function processSale(cart) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetVentas = ss.getSheetByName('VENTAS');
  const sheetInv = ss.getSheetByName('INVENTARIO');
  const timestamp = new Date();
  const saleID = 'V-' + Math.floor(Math.random() * 1000000);
  
  // BLOQUEO DE SEGURIDAD (LockService)
  // Esto evita que dos personas vendan el mismo producto al mismo milisegundo
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Esperar hasta 10 seg si otro está vendiendo
  } catch (e) {
    return { success: false, message: "El servidor está ocupado. Intenta de nuevo." };
  }

  // VALIDACIÓN DE STOCK REAL
  const inventoryValues = sheetInv.getRange(2, 1, sheetInv.getLastRow() - 1, 8).getValues();
  
  for (let item of cart) {
    let productRow = inventoryValues.find(r => String(r[0]) == String(item.id));
    let realStock = Number(productRow ? productRow[7] : 0);

    if (!productRow || realStock < item.cantidad) {
      lock.releaseLock();
      return { success: false, message: "Stock insuficiente para: " + item.nombre };
    }
  }
  
  // GUARDAR VENTA
  let newRows = [];
  cart.forEach(item => {
    newRows.push([
      saleID,           
      timestamp,        
      item.id,          
      item.cantidad,    
      item.total        
    ]);
  });

  // Escribir todo de una vez (más rápido)
  if (newRows.length > 0) {
    sheetVentas.getRange(sheetVentas.getLastRow() + 1, 1, newRows.length, 5).setValues(newRows);
  }
  
  SpreadsheetApp.flush(); // Forzar actualización inmediata
  lock.releaseLock();
  
  return { success: true, message: "Venta registrada correctamente" };
}