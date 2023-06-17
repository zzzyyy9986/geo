import * as React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

export const App = () => (

    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
        </Routes>
    </BrowserRouter>

);

const Home = () => <h2>Главная</h2>;

const About = () => <h2>Контакты</h2>;

const Users = () => <h2>Пользователи</h2>;

export default App;
