import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDocFromServer, runTransaction } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const product = doc(getFirestore(app), 'publicacion', 'ficha');
let baseline;

export async function loadProduct() {
  const snapshot = await getDocFromServer(product);
  baseline = snapshot.data()?.contenido ?? null;
  return baseline === null ? null : JSON.parse(baseline);
}

export async function publishProduct(data) {
  if (baseline === undefined) throw new Error('Primero hay que cargar la ficha publicada.');
  const content = JSON.stringify(data);
  if (new TextEncoder().encode(content).length >= 900000) {
    throw new Error('La ficha supera el límite de 900 KB. Reducí el tamaño de las imágenes.');
  }
  const user = auth.currentUser || (await signInWithPopup(auth, new GoogleAuthProvider())).user;
  if (user.email !== 'pric.administracion@gmail.com') {
    await auth.signOut();
    throw new Error('Ingresá con la cuenta de PRIC.');
  }
  await runTransaction(getFirestore(app), async transaction => {
    const current = await transaction.get(product);
    if ((current.data()?.contenido ?? null) !== baseline) {
      throw new Error('La ficha cambió en otro navegador. Recargá para ver la versión publicada.');
    }
    transaction.set(product, {contenido: content});
  });
  baseline = content;
}
