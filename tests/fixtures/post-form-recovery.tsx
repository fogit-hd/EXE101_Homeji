import React from 'react'
import {createRoot} from 'react-dom/client'
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom'
import {AuthProvider} from '/src/contexts/AuthContext.tsx'
import {GoogleMapsContext} from '/src/contexts/GoogleMapsProvider.logic.tsx'
import {ToastProvider} from '/src/components/toast/ToastProvider.tsx'
import {CreateRentalPostPage} from '/src/pages/CreateRentalPostPage.tsx'
import {EditRentalPostPage} from '/src/pages/EditRentalPostPage.tsx'
import {LiquidGlassEffects} from '/src/components/ui/LiquidGlassEffects.tsx'
import '/src/index.css'
import '/src/liquid-glass.css'
import '/src/glass-controls.css'
function Destination(){const l=useLocation();return <output data-testid="destination">{l.search}</output>}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[new URLSearchParams(window.location.search).has('create') ? '/posts/new?type=transfer' : '/posts/qa/edit']}><AuthProvider><ToastProvider><GoogleMapsContext.Provider value={{apiKey:'fixture-only',isLoaded:true,mapId:'fixture',loadError:undefined}}><LiquidGlassEffects/><Routes><Route path="/posts/new" element={<CreateRentalPostPage/>}/><Route path="/posts/:postId/edit" element={<EditRentalPostPage/>}/><Route path="/" element={<Destination/>}/></Routes></GoogleMapsContext.Provider></ToastProvider></AuthProvider></MemoryRouter>)
