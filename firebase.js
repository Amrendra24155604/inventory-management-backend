import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: "AIzaSyBomi00puNHYy1niYI-IZzaXDEvLCTVzBU",
//   authDomain: "fir-basics-2cb88.firebaseapp.com",
//   projectId: "fir-basics-2cb88",
//   storageBucket: "fir-basics-2cb88.appspot.com",
//   messagingSenderId: "732616140926",
//   appId: "1:732616140926:web:38dcd67a91dd66501ad02f",
//   measurementId: "G-8K73GS8W4S",
//   databaseURL:"https://fir-basics-2cb88-default-rtdb.firebaseio.com/"
// };
const firebaseConfig = {
  apiKey: "AIzaSyBb8A2i7jQ7g5qZGT24FKQgBDvLHtdTt_o",
  authDomain: "invmanagement-774b6.firebaseapp.com",
  projectId: "invmanagement-774b6",
  storageBucket: "invmanagement-774b6.firebasestorage.app",
  messagingSenderId: "891974729305",
  appId: "1:891974729305:web:f7bdc44b57b9d13063fb48",
  measurementId: "G-VJRVCW7CPK"
};

// firebase.js
// firebase.js
import admin from "firebase-admin";
import { createRequire } from "module";
// const require = createRequire(import.meta.url);
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
console.log("Auth instance:", auth);
console.log("Provider:", provider);
export { auth, provider };
