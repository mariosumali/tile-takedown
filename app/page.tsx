import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Hero from '@/components/landing/Hero';
import ModesSection from '@/components/landing/ModesSection';
import StatsSection from '@/components/landing/StatsSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ControlsSection from '@/components/landing/ControlsSection';

export default function Home() {
  return (
    <>
      <Nav active="home" />
      <Hero />
      <ModesSection />
      <StatsSection />
      <FeaturesSection />
      <ControlsSection />
      <Footer />
    </>
  );
}
