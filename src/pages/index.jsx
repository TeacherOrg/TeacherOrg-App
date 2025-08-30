import Layout from "./Layout.jsx";

import Timetable from "./Timetable";

import Grades from "./Grades";

import Groups from "./Groups";

import YearlyOverview from "./YearlyOverview";

import Chores from "./Chores";

import { Route, Routes, useLocation } from 'react-router-dom';  // Entferne BrowserRouter as Router – wir importieren ihn nicht mehr hier

const PAGES = {
    
    Timetable: Timetable,
    
    Grades: Grades,
    
    Groups: Groups,
    
    YearlyOverview: YearlyOverview,
    
    Chores: Chores,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

export default function Pages() {  // Entferne PagesContent – mache Pages direkt zur Komponente mit useLocation
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Timetable />} />
                
                
                <Route path="/Timetable" element={<Timetable />} />
                
                <Route path="/Grades" element={<Grades />} />
                
                <Route path="/Groups" element={<Groups />} />
                
                <Route path="/YearlyOverview" element={<YearlyOverview />} />
                
                <Route path="/Chores" element={<Chores />} />
                
            </Routes>
        </Layout>
    );
}