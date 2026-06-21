// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { injectStore } from '../api/api';
import userReducer from './slices/userSlice';
import documentsReducer from "./slices/documentSlice"
import departmentsReducer from "./slices/departmentsSlice"
import streamFileReducer from "./slices/streamSlice"
import registryReducer from "./slices/registrySlice"
import stationsReducer from "./slices/stationsSlice"
import calendarReducer from "./slices/calendarSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    documents: documentsReducer,
    departments: departmentsReducer,
    streamFile: streamFileReducer,
    registry: registryReducer,
    stations: stationsReducer,
    calendar: calendarReducer,
  },
});

// Dynamically inject our store instance into the Axios interceptor array cleanly at runtime
injectStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;