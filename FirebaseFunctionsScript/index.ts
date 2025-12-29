import {initializeApp} from "firebase-admin/app";

// Firebase Admin 초기화는 한 번만
initializeApp();

// 트리거(Functions) export
export {createUserDoc} from "./onCreateUser";
