import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import HotCases from './pages/HotCases';
import CaseDetail from './pages/CaseDetail';
import Counties from './pages/Counties';
import CountyDetail from './pages/CountyDetail';
import Templates from './pages/Templates';
import HowTo from './pages/HowTo';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Cases": Cases,
    "HotCases": HotCases,
    "CaseDetail": CaseDetail,
    "Counties": Counties,
    "CountyDetail": CountyDetail,
    "Templates": Templates,
    "HowTo": HowTo,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};