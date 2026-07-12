/** Impressum (§ 5 DDG, § 18 Abs. 2 MStV). Legal prose lives here as content,
 * deliberately outside the i18n dictionary (single-language legal text). */

import './legal.css';

export function ImpressumPage() {
  return (
    <div className="legal">
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <address>
        <strong>Martin Pfeffer</strong>
        <br />
        Flughafenstraße 24
        <br />
        12053 Berlin
        <br />
        Deutschland
      </address>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:martin.pfeffer@celox.io">martin.pfeffer@celox.io</a>
        <br />
        Telefon: +49&nbsp;151&nbsp;590&nbsp;824&nbsp;65
      </p>

      <h2>Umsatzsteuer</h2>
      <p>Steuernummer: 16/470/02351 (Finanzamt Berlin Neukölln)</p>

      <h2>Berufsbezeichnung</h2>
      <p>Freiberuflicher Software-Entwickler und IT-Berater. Keine Eintragung im Handelsregister erforderlich.</p>

      <h2>Verantwortlich i.&nbsp;S.&nbsp;d. § 18 Abs. 2 MStV</h2>
      <p>Martin Pfeffer, Flughafenstraße 24, 12053 Berlin</p>

      <h2>Streitbeilegung</h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Die Rezepte und Cocktail-Anleitungen dieser App werden automatisiert durch ein KI-System erzeugt.
        Trotz sorgfältiger Gestaltung des Systems übernehmen wir keine Gewähr für Richtigkeit, Vollständigkeit
        und Aktualität der generierten Inhalte. Näheres regeln die{' '}
        <a href="/nutzungsbedingungen">Nutzungsbedingungen</a>.
      </p>
    </div>
  );
}
