import { useEffect, useState } from 'react';
import bg1 from '../assets/LibraryBackground1.jpg';
import bg2 from '../assets/LibraryBackground2.jpg';
import bg4 from '../assets/LibraryBackground4.jpg';
import bg5 from '../assets/LibraryBackground5.jpg';

const backgrounds = [bg1, bg2, bg4, bg5];

export default function BackgroundCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % backgrounds.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      {backgrounds.map((bg, index) => (
        <div
          key={bg}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      ))}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
