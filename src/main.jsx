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

function TripForm() {
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
      const findPlace = async (place) => {
        const query = new URLSearchParams({ q: place, format: 'jsonv2', limit: '1' });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`);
        if (!response.ok) throw new Error('The place search is temporarily unavailable. Please try again.');
        const results = await response.json();
        if (!results.length) throw new Error(`We couldn’t find “${place}”. Try adding a city or region.`);
        return { latitude: Number(results[0].lat), longitude: Number(results[0].lon), label: results[0].display_name };
      };

      const start = await findPlace(from);
      await new Promise((resolve) => window.setTimeout(resolve, 1100));
      const destination = await findPlace(to);
      const coords = `${start.longitude},${start.latitude};${destination.longitude},${destination.latitude}`;
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
    <form className="trip-form" id="plan" onSubmit={handleSubmit}>
      <h2>Where are you headed?</h2>
      <div className="form-fields">
        <label>FROM<input name="from" placeholder="Starting city" required /></label>
        <label>TO<input name="to" placeholder="Destination" required /></label>
        <label>WHEN<input name="date" type="date" aria-label="Departure date" /></label>
          <button type="submit" disabled={isLoading}>{isLoading ? 'Finding route…' : 'Find my trip'} <span aria-hidden="true">→</span></button>
      </div>
      <p id="form-message" className={isLoading ? 'is-loading' : ''} role="status" aria-live="polite">{message}</p>
      {route && <RouteMap route={route} />}
    </form>
  );
}

function App() {
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
          <TripForm />
        </section>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
