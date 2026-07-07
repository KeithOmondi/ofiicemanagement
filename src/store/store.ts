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
import dsaReducer from "./slices/dsaSlice"
import tasksReducer from "./slices/tasksSlice"
import inventoryReducer from "./slices/inventorySlice"
import financialReducer from "./slices/financialSlice"
import signatureReducer from "./slices/signatureSlice"
import messagesReducer from "./slices/messagesSlice"
import helpdeskReducer from "./slices/helpdeskSlice"
import noticesReducer from "./slices/noticesSlice"
import notificationsReducer from "./slices/notificationsSlice"
import linksReducer from "./slices/linksSlice"
import templatesReducer from "./slices/templatesSlice"
import helpdeskDocumentsReducer from './slices/helpdeskDocumentsSlice';
import ticketsReducer from "./slices/ticketSlice"

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
    dsa: dsaReducer,
    tasks: tasksReducer,
    inventory: inventoryReducer,
    financial: financialReducer,
    signature: signatureReducer,
    messages: messagesReducer,
    helpdesk: helpdeskReducer,
    notices: noticesReducer,
    notifications: notificationsReducer,
    links: linksReducer,
    templates: templatesReducer,
    helpdeskDocuments: helpdeskDocumentsReducer,
    tickets: ticketsReducer
  },
});

// Dynamically inject our store instance into the Axios interceptor array cleanly at runtime
injectStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;