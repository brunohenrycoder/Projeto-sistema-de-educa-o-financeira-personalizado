import { Link } from 'react-router-dom'
import './HomeBreadcrumbLink.css'

export default function HomeBreadcrumbLink() {
  return (
    <Link className="breadcrumb-link" to="/">
      Família
    </Link>
  )
}
