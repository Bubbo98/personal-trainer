import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Reviews from '../components/Reviews';
import Footer from '../components/Footer';

// Types
interface HomePageProps {}

const Home: React.FC<HomePageProps> = () => {
  const pageClassName = 'h-full w-full';

  return (
    <div className={pageClassName}>
      <Header />
      <Hero />
      <Reviews />
      <Footer />
    </div>
  );
};

export default Home;