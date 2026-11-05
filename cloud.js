import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, inMemoryPersistence, sendEmailVerification, setPersistence, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDocFromServer, runTransaction } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, getMetadata } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const product = doc(getFirestore(app), 'publicacion', 'ficha');
let baseline;
const adminEmail = 'pric.administracion@gmail.com';

export async function unlockAdmin(password, sendVerification = false) {
  await setPersistence(auth, inMemoryPersistence);
  const {user} = await signInWithEmailAndPassword(auth, adminEmail, password);
  if (!user.emailVerified) {
    try {
      if (sendVerification) await sendEmailVerification(user);
    } finally {
      await signOut(auth);
    }
    return false;
  }
  return true;
}

export async function loadProduct() {
  const snapshot = await getDocFromServer(product);
  baseline = snapshot.data()?.contenido ?? null;
  return baseline === null ? null : JSON.parse(baseline);
}

export async function publishProduct(data) {
  if (baseline === undefined) throw new Error('Primero hay que cargar la ficha publicada.');
  if (auth.currentUser?.email !== adminEmail) throw new Error('Ingresá con la contraseña de administrador.');
  const published = structuredClone(data);
  if (firebaseConfig.storageBucket) await storeImages(published);
  const content = JSON.stringify(published);
  if (new TextEncoder().encode(content).length >= 900000) {
    throw new Error('La ficha supera el límite de 900 KB. Reducí el tamaño de las imágenes.');
  }
  await runTransaction(getFirestore(app), async transaction => {
    const current = await transaction.get(product);
    if ((current.data()?.contenido ?? null) !== baseline) {
      throw new Error('La ficha cambió en otro navegador. Recargá para ver la versión publicada.');
    }
    transaction.set(product, {contenido: content});
  });
  baseline = content;
  return published;
}

async function storeImages(data) {
  const storage = getStorage(app);
  const uploaded = new Map();
  async function store(url) {
    if (typeof url !== 'string' || !url.startsWith('data:image/')) return url;
    if (uploaded.has(url)) return uploaded.get(url);
    const blob = await (await fetch(url)).blob();
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const extensions = {'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg'};
    const extension = extensions[blob.type];
    if (!extension || blob.size >= 5 * 1024 * 1024) {
      throw new Error('Volvé a cargar esta imagen para optimizarla antes de publicar.');
    }
    const target = ref(storage, 'productos/' + hash + '.' + extension);
    try {
      await getMetadata(target);
    } catch (error) {
      if (error.code !== 'storage/object-not-found') throw error;
      await uploadBytes(target, blob, {contentType: blob.type, cacheControl: 'public,max-age=31536000,immutable'});
    }
    const remote = await getDownloadURL(target);
    uploaded.set(url, remote);
    return remote;
  }
  for (let index = 0; index < data.images.length; index++) {
    data.images[index] = await store(data.images[index]);
  }
  data.detail = await store(data.detail);
  data.drawing = await store(data.drawing);
  for (const group of ['features', 'accessories', 'parts']) {
    for (const item of data[group]) item.image = await store(item.image);
  }
}
