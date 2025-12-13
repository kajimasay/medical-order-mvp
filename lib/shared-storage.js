// 共有メモリストレージ - クリーンな状態から開始
// グローバルストレージアクセス
if (!global.fileStorage) {
  global.fileStorage = [];
  console.log('Initialized clean global file storage');
}

export function getGlobalFiles() {
  return global.fileStorage || [];
}

export function addGlobalFile(file) {
  if (!global.fileStorage) {
    global.fileStorage = [];
  }
  
  const existingIndex = global.fileStorage.findIndex(f => f.id === file.id);
  if (existingIndex === -1) {
    global.fileStorage.unshift(file);
  } else {
    global.fileStorage[existingIndex] = file;
  }
  
  return global.fileStorage;
}

export function getGlobalFileById(fileId) {
  if (!global.fileStorage) return null;
  return global.fileStorage.find(f => f.id === fileId);
}