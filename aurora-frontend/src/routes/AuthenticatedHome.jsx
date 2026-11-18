import LogoutButton from '../features/logout/LogoutButton.jsx'
import './AuthenticatedHome.css'

export default function AuthenticatedHome() {
  return (
    <main className="container authenticated-home">
      <p>Autenticação realizada. Você está na sua conta Aurora.</p>
      <LogoutButton />
    </main>
  )
}
