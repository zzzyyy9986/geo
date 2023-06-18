import * as React from 'react';
import Map, {NavigationControl} from "react-map-gl";
import Navbar from "./navbar";
import maplibregl from 'maplibre-gl';
import {MarkPanel} from "./MarkPanel";


export const MarkPage = () => {
    return (
        <div className='container-fluid'>
            <div className="row">
                <Navbar/>

            </div>
            <div className="row mt-3">
                <div className="col-md-8">
                    <Map mapLib={maplibregl}
                         initialViewState={{
                             longitude: 16.62662018,
                             latitude: 49.2125578,
                             zoom: 14
                         }}
                         style={{width: "100%", height: " calc(100vh - 77px)"}}
                         mapStyle="https://api.maptiler.com/maps/streets/style.json?key=sB8mHmHdWLukjiQctNE5"
                    >
                        <NavigationControl position="top-left" />
                    </Map>
                </div>
                <div className="col-md-4">
                    <MarkPanel/>
                </div>
            </div>
        </div>
    )

}