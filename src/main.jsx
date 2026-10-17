import React, { useState } from 'react';
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

function TripForm() {
  const [message, setMessage] = useState('Trip matching is on the way.');

  function handleSubmit(event) {
    event.preventDefault();
    const trip = new FormData(event.currentTarget);
    const from = trip.get('from').trim();
    const to = trip.get('to').trim();
    setMessage(`Your ${from} to ${to} trip is on the map. Trip matching is coming soon.`);
  }

  return (
    <form className="trip-form" id="plan" onSubmit={handleSubmit}>
      <h2>Where are you headed?</h2>
      <div className="form-fields">
        <label>FROM<input name="from" placeholder="Starting city" required /></label>
        <label>TO<input name="to" placeholder="Destination" required /></label>
        <label>WHEN<input name="date" type="date" aria-label="Departure date" /></label>
        <button type="submit">Find my trip <span aria-hidden="true">→</span></button>
      </div>
      <p id="form-message" role="status" aria-live="polite">{message}</p>
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
