/** Nutzungsbedingungen. Legal prose lives here as content, deliberately
 * outside the i18n dictionary (single-language legal text). */

import './legal.css';

export function TermsPage() {
  return (
    <div className="legal">
      <h1>Nutzungsbedingungen</h1>
      <p>Stand: 12. Juli 2026</p>

      <h2>1. Geltungsbereich und Anbieter</h2>
      <p>
        Diese Bedingungen gelten für die Nutzung von zauberkoch.de („die App"). Anbieter ist Martin
        Pfeffer (siehe <a href="/impressum">Impressum</a>). Die App befindet sich in einer{' '}
        <strong>geschlossenen Beta</strong> und wird unentgeltlich bereitgestellt; der Zugang erfolgt über
        Freischaltung oder Einladungs-Codes.
      </p>

      <h2>2. KI-generierte Inhalte — wichtige Hinweise</h2>
      <p>
        Alle Rezepte, Anleitungen, Nährwertangaben und Zutaten-Vorschläge werden{' '}
        <strong>automatisiert durch ein KI-System erzeugt</strong> und nicht redaktionell geprüft. Sie
        können Fehler enthalten. Insbesondere gilt:
      </p>
      <ul>
        <li>
          <strong>Allergien und Unverträglichkeiten:</strong> Prüfe alle Zutaten eigenverantwortlich.
          Kennzeichnungen wie „glutenfrei", „laktosefrei", „vegan" oder Nährwertangaben sind
          Schätzungen des KI-Systems und <strong>keine verlässliche Grundlage</strong> bei Allergien,
          Unverträglichkeiten oder besonderen Ernährungsanforderungen (z.&nbsp;B. Schwangerschaft,
          Diabetes).
        </li>
        <li>
          <strong>Lebensmittelsicherheit:</strong> Gar- und Kerntemperaturen, Hygiene und die
          Genusstauglichkeit von Zutaten (z.&nbsp;B. Fleisch, Fisch, Eier, Muscheln) sind stets selbst zu
          prüfen. Im Zweifel gelten die anerkannten Regeln der Küchenpraxis, nicht die KI-Ausgabe.
        </li>
        <li>
          Die Zutaten-Erkennung aus Fotos ist ein Hilfsmittel und kann Lebensmittel falsch erkennen.
        </li>
      </ul>

      <h2>3. Alkohol und Jugendschutz</h2>
      <p>
        Der Cocktail-Modus enthält Rezepte mit Alkohol und ist erst nach Bestätigung der Volljährigkeit
        (18+) nutzbar. Bitte konsumiere Alkohol verantwortungsvoll; kein Konsum in Schwangerschaft, im
        Straßenverkehr oder bei entsprechenden gesundheitlichen Einschränkungen.
      </p>

      <h2>4. Zulässige Nutzung</h2>
      <p>
        Die App ist für die private Nutzung bestimmt. Unzulässig sind insbesondere: automatisierte
        Massenabfragen, das Umgehen von Nutzungslimits, Angriffe auf die Infrastruktur sowie Eingaben, die
        Rechte Dritter verletzen oder rechtswidrige Inhalte erzeugen sollen. Nutzungslimits (z.&nbsp;B.
        Generierungen pro Tag) dienen der Kostenkontrolle und können angepasst werden.
      </p>

      <h2>5. Geteilte Rezepte und öffentliche Galerie</h2>
      <p>
        Du entscheidest selbst, ob ein Rezept per Link geteilt oder in der öffentlichen Galerie gelistet
        wird. Mit der Veröffentlichung räumst du uns ein einfaches, widerrufliches Nutzungsrecht ein, das
        Rezept in der App, der Galerie und in Vorschaubildern (z.&nbsp;B. beim Teilen in sozialen Medien)
        anzuzeigen. Du kannst Teilen und Listung jederzeit widerrufen. Für von dir veröffentlichte Inhalte
        (z.&nbsp;B. eigene Eingaben im Rezept) bist du verantwortlich; rechtswidrige Inhalte können wir
        entfernen.
      </p>

      <h2>6. Verfügbarkeit</h2>
      <p>
        Als unentgeltliche Beta wird die App ohne Zusage einer bestimmten Verfügbarkeit bereitgestellt.
        Funktionen können sich ändern oder eingestellt werden. Wir empfehlen, wichtige Rezepte zu
        exportieren (Kopier-/Teilen-Funktion).
      </p>

      <h2>7. Haftung</h2>
      <p>
        Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden an Leben, Körper
        und Gesundheit. Bei einfacher Fahrlässigkeit haften wir nur für die Verletzung wesentlicher
        Vertragspflichten (Kardinalpflichten), begrenzt auf den vorhersehbaren, vertragstypischen Schaden.
        Die Nutzung der KI-generierten Inhalte — insbesondere das Zubereiten und Verzehren von Speisen und
        Getränken — erfolgt auf eigene Verantwortung (siehe Ziffer 2).
      </p>

      <h2>8. Konto und Beendigung</h2>
      <p>
        Du kannst die Nutzung jederzeit beenden und die Löschung deines Kontos per E-Mail verlangen. Wir
        können Konten bei Verstößen gegen diese Bedingungen oder zum Schutz des Betriebs sperren.
      </p>

      <h2>9. Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht. Wir können diese Bedingungen mit Wirkung für die Zukunft anpassen; die
        aktuelle Fassung ist stets hier abrufbar. Sollten einzelne Bestimmungen unwirksam sein, bleibt die
        Wirksamkeit der übrigen unberührt.
      </p>
    </div>
  );
}
