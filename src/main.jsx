import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

function Header() {
  return (
    <header className="navbar">
      <a className="brand" href="#top"><span aria-hidden="true">✈</span> RoadTrip Match</a>
      <nav aria-label="Main navigation">
        <a className="active" href="#top">Home</a>
        <a href="#about">About</a>
        <a href="#plan">Plan a trip</a>
      </nav>
      <a className="nav-action" href="#plan">Get started <span aria-hidden="true">→</span></a>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-content">
        <p className="kicker">YOUR NEXT ADVENTURE STARTS HERE</p>
        <h1 id="hero-title">RoadTrip Match</h1>
        <p className="tagline">Find your people. Take the long way.</p>
        <hr />
        <a className="start-button" href="#plan"><span aria-hidden="true">✦</span> Get Started</a>
      </div>
      <a className="scroll-cue" href="#about">Scroll to explore <span aria-hidden="true">↓</span></a>
    </section>
  );
}

async function geocodePlace(place) {
  const query = new URLSearchParams({ q: place, format: 'jsonv2', limit: '1' });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`);
  if (!response.ok) throw new Error('The place search is temporarily unavailable. Please try again.');
  const results = await response.json();
  if (!results.length) throw new Error(`We couldn’t find “${place}”. Try adding a city or region.`);
  return { latitude: Number(results[0].lat), longitude: Number(results[0].lon), label: results[0].display_name };
}

function RouteMap({ route }) {
  const mapElement = useRef(null);

  useEffect(() => {
    if (!mapElement.current || !window.L) return undefined;

    const map = window.L.map(mapElement.current, { scrollWheelZoom: false });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);

    const line = window.L.geoJSON(route.geometry, {
      style: { color: '#d75f3c', weight: 5, opacity: 0.9 },
    }).addTo(map);
    const start = route.geometry.coordinates[0].slice().reverse();
    const end = route.geometry.coordinates.at(-1).slice().reverse();
    window.L.marker(start).addTo(map).bindPopup(route.from);
    window.L.marker(end).addTo(map).bindPopup(route.to);
    map.fitBounds(line.getBounds(), { padding: [28, 28] });
    mapElement.current.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return () => map.remove();
  }, [route]);

  return <div className="route-map" ref={mapElement} aria-label={`Driving route from ${route.from} to ${route.to}`} />;
}

function TripForm({ destination, onDestinationChange }) {
  const [message, setMessage] = useState('Enter a starting point and destination to see your route.');
  const [route, setRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trip = new FormData(event.currentTarget);
    const from = trip.get('from').trim();
    const to = trip.get('to').trim();
    setRoute(null);
    setIsLoading(true);
    setMessage('Finding your places and mapping the drive…');

    try {
      const start = await geocodePlace(from);
      await new Promise((resolve) => window.setTimeout(resolve, 1100));
      const end = await geocodePlace(to);
      const coords = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
      if (!response.ok) throw new Error('Directions are temporarily unavailable. Please try again.');
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('We couldn’t find a driving route between those places.');

      const drive = data.routes[0];
      setRoute({ from, to, geometry: drive.geometry, distance: drive.distance, duration: drive.duration });
      const miles = Math.round(drive.distance / 1609.344);
      const hours = Math.floor(drive.duration / 3600);
      const minutes = Math.round((drive.duration % 3600) / 60);
      setMessage(`${miles.toLocaleString()} miles · about ${hours ? `${hours} hr ` : ''}${minutes} min by car`);
    } catch (error) {
      setMessage(error.message || 'Something went wrong while finding your route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <h2>Where are you headed?</h2>
      <div className="form-fields">
        <label>FROM<input name="from" placeholder="Starting city" required /></label>
        <label>TO<input name="to" placeholder="Destination" value={destination} onChange={(event) => onDestinationChange(event.target.value)} required /></label>
        <label>WHEN<input name="date" type="date" aria-label="Departure date" /></label>
          <button type="submit" disabled={isLoading}>{isLoading ? 'Finding route…' : 'Find my trip'} <span aria-hidden="true">→</span></button>
      </div>
      <p id="form-message" className={isLoading ? 'is-loading' : ''} role="status" aria-live="polite">{message}</p>
      {route && <RouteMap route={route} />}
    </form>
  );
}

function HotelSearch({ destination, onDestinationChange }) {
  const [hotels, setHotels] = useState([]);
  const [message, setMessage] = useState('Search for stays near your destination.');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setHotels([]);
    setIsLoading(true);
    setHasSearched(true);
    setMessage(`Looking for stays near ${destination.trim()}…`);

    try {
      const place = await geocodePlace(destination.trim());
      const query = `[out:json][timeout:25];(nwr["tourism"~"hotel|guest_house|motel|hostel|chalet|apartment"](around:10000,${place.latitude},${place.longitude}););out center 30;`;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
      });
      if (!response.ok) throw new Error('Hotel listings are temporarily unavailable. Please try again.');
      const data = await response.json();
      const results = data.elements
        .map((item) => {
          const lat = item.lat ?? item.center?.lat;
          const lon = item.lon ?? item.center?.lon;
          const tags = item.tags || {};
          return {
            id: `${item.type}-${item.id}`,
            name: tags.name || tags.brand || tags.operator,
            kind: (tags.tourism || 'accommodation').replaceAll('_', ' '),
            address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' '),
            lat,
            lon,
            distance: Math.hypot((lat - place.latitude) * 111, (lon - place.longitude) * 111 * Math.cos(place.latitude * Math.PI / 180)),
          };
        })
        .filter((item) => item.name && Number.isFinite(item.lat) && Number.isFinite(item.lon))
        .sort((a, b) => a.distance - b.distance);

      setHotels(results);
      setMessage(results.length ? `${results.length} nearby stay${results.length === 1 ? '' : 's'} near ${destination.trim()}` : `No mapped stays found near ${destination.trim()}. Try a nearby city or wider area.`);
    } catch (error) {
      setMessage(error.message || 'Something went wrong while searching for stays. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="hotel-panel">
      <h2>Find a place to stay</h2>
      <p className="hotel-intro">Browse hotels and other stays near your stop.</p>
      <form className="hotel-search" onSubmit={handleSubmit}>
        <label>DESTINATION<input value={destination} onChange={(event) => onDestinationChange(event.target.value)} placeholder="City or destination" required /></label>
        <button type="submit" disabled={isLoading}>{isLoading ? 'Searching…' : 'Search stays'} <span aria-hidden="true">→</span></button>
      </form>
      <p className={isLoading ? 'hotel-status is-loading' : 'hotel-status'} role="status" aria-live="polite">{message}</p>
      {hotels.length > 0 && (
        <ul className="hotel-results">
          {hotels.map((hotel) => (
            <li className="hotel-result" key={hotel.id}>
              <div><h3>{hotel.name}</h3><p>{hotel.kind}{hotel.address ? ` · ${hotel.address}` : ''}</p><span>{hotel.distance < 1 ? `${Math.round(hotel.distance * 1000)} m` : `${hotel.distance.toFixed(1)} km`} from destination</span></div>
              <a href={`https://www.openstreetmap.org/?mlat=${hotel.lat}&mlon=${hotel.lon}#map=17/${hotel.lat}/${hotel.lon}`} target="_blank" rel="noreferrer">View map ↗</a>
            </li>
          ))}
        </ul>
      )}
      {hasSearched && !isLoading && <p className="hotel-disclaimer">Listings come from OpenStreetMap and may not include prices or availability. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>}
    </div>
  );
}

function App() {
  const [destination, setDestination] = useState('');
  const [activeTab, setActiveTab] = useState('route');

  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <Header />
      <main id="top">
        <Hero />
        <section className="below-fold" id="about">
          <div className="about-copy">
            <p className="kicker dark">GOOD TRIPS START WITH A GOOD MATCH</p>
            <h2>Make the miles<br />mean something.</h2>
            <p>Pick a destination, find fellow travelers headed your way, and turn the open road into a shared adventure.</p>
          </div>
          <div className="trip-planner" id="plan">
            <div className="trip-tabs" role="tablist" aria-label="Trip planning options">
              <button id="route-tab" type="button" role="tab" aria-selected={activeTab === 'route'} aria-controls="route-panel" className={activeTab === 'route' ? 'selected' : ''} onClick={() => setActiveTab('route')}>Road trip</button>
              <button id="hotel-tab" type="button" role="tab" aria-selected={activeTab === 'hotels'} aria-controls="hotel-panel" className={activeTab === 'hotels' ? 'selected' : ''} onClick={() => setActiveTab('hotels')}>Hotels</button>
            </div>
            {activeTab === 'route' ? (
              <div id="route-panel" role="tabpanel" aria-labelledby="route-tab"><TripForm destination={destination} onDestinationChange={setDestination} /></div>
            ) : (
              <div id="hotel-panel" role="tabpanel" aria-labelledby="hotel-tab"><HotelSearch destination={destination} onDestinationChange={setDestination} /></div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
