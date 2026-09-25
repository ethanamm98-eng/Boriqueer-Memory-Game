import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";

export default function AppFooter() {
  const { language } = useLanguage();
  const spanish = language === "es";

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-creator">
          <img src="/cards-v2/card-11.webp" alt="Sexkúl" />
          <div>
            <small>{spanish ? "Juego por" : "Game by"}</small>
            <strong>Sexkúl</strong>
          </div>
        </div>

        <nav className="footer-contact" aria-label={spanish ? "Contacto del creador" : "Creator contact"}>
          <a href="mailto:sexed.mitchell@gmail.com"><Icon name="mail" /> sexed.mitchell@gmail.com</a>
          <a href="https://instagram.com/sexkul.pr" target="_blank" rel="noreferrer"><Icon name="instagram" /> @sexkúl.pr</a>
        </nav>

        <a className="footer-studio" href="https://google.com" target="_blank" rel="noreferrer">
          <span>{spanish ? "Sitio web por" : "Website by"}</span>
          <strong>EA Market <Icon name="external" /></strong>
        </a>
      </div>
    </footer>
  );
}
