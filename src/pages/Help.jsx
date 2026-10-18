import { Link } from 'react-router-dom'
import { Header, Footer } from '../components/UI.jsx'
export default function Help() {
  return (
    <>
      <Header>
        <Link className="btn btn-secondary" to="/admin">
          Espace enseignant
        </Link>
      </Header>
      <main id="main-content" className="shell help-layout">
        <p className="eyebrow">Quelques repères</p>
        <h1 className="serif">
          Un espace simple,
          <br />
          pour chacun.
        </h1>
        <p className="muted">
          Les élèves consultent les supports. Les enseignants organisent les
          classes et décident de leur publication.
        </p>
        <details open>
          <summary>Élève : comment retrouver mes cours ?</summary>
          <ol>
            <li>Demande le lien ou le code de la classe à ton professeur.</li>
            <li>
              Colle-le sur la page d’accueil. Aucun compte n’est nécessaire.
            </li>
            <li>
              Choisis un chapitre ou recherche un document, puis ouvre-le ou
              télécharge-le.
            </li>
          </ol>
        </details>
        <details>
          <summary>À quoi servent « À revoir » et « Lu » ?</summary>
          <p className="muted">
            Ce sont tes repères personnels pour organiser tes révisions. Ils
            restent dans ce navigateur et ne sont pas transmis à ton professeur.
            Ils ne mesurent ni une note, ni ta maîtrise du cours. Sur un
            appareil partagé, utilise « Effacer mes repères » dans ta classe
            avant de partir.
          </p>
        </details>
        <details>
          <summary>Enseignant : j’ai oublié mon mot de passe</summary>
          <p className="muted">
            Depuis l’
            <Link className="text-link" to="/admin">
              espace enseignant
            </Link>
            , choisis « Mot de passe oublié ? » et renseigne l’adresse de ton
            compte. Consulte aussi les courriers indésirables. Le lien reçu te
            permet de choisir un nouveau mot de passe. Tu n’as pas besoin de
            code d’invitation pour récupérer un compte existant.
          </p>
        </details>
        <details>
          <summary>Comment créer un compte enseignant ?</summary>
          <p className="muted">
            L’inscription est réservée aux enseignants ayant reçu un code
            d’invitation de l’administrateur de la plateforme. Chaque code sert
            une seule fois. Un code de classe destiné aux élèves ne permet pas
            de s’inscrire. Si ton adresse possède déjà un compte, utilise la
            récupération du mot de passe.
          </p>
          <p>
            <Link className="text-link" to="/inscription">
              J’ai un code d’invitation →
            </Link>
          </p>
        </details>
        <details>
          <summary>Quand mes documents deviennent-ils visibles ?</summary>
          <p className="muted">
            Les changements de l’éditeur restent dans le brouillon jusqu’à «
            Enregistrer ». Un cours est proposé comme publié ; un contrôle ou
            une correction est proposé comme masqué. Tu peux modifier ce choix
            avant d’enregistrer. La publication d’un contrôle demande une
            confirmation.
          </p>
          <p className="muted">
            Masquer un document empêche la création de nouveaux liens d’accès.
            Un lien temporaire déjà ouvert peut rester valable quelques minutes
            ; un fichier déjà téléchargé ne peut pas être retiré de l’appareil
            de l’élève.
          </p>
        </details>
        <details>
          <summary>Comment partager une classe ?</summary>
          <p className="muted">
            Depuis « Mes classes », clique sur « Partager ». Tu peux copier le
            code, le lien ou télécharger un QR code à projeter en classe. Toute
            personne disposant du lien peut consulter les documents publiés :
            partage-le avec les élèves concernés.
          </p>
        </details>
        <details>
          <summary>
            Un fichier ne s’ouvre pas ou une classe est introuvable
          </summary>
          <p className="muted">
            Vérifie le code et ta connexion, puis réessaie. Un document peut
            avoir été masqué ou supprimé par ton professeur. Pour les fichiers
            Word, tableurs et autres formats sans aperçu intégré, utilise «
            Télécharger » puis ouvre-les avec une application compatible.
          </p>
        </details>
        <p style={{ marginTop: 28 }}>
          <Link className="btn btn-primary" to="/demo">
            Essayer avec une classe de démonstration →
          </Link>
        </p>
      </main>
      <Footer />
    </>
  )
}
