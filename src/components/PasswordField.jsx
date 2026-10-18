import { useId, useState } from 'react'
import Icon from './Icon.jsx'
export default function PasswordField({
  value,
  onChange,
  placeholder = 'Mot de passe',
  autoComplete,
  className = '',
  label,
  minLength,
  required = true,
}) {
  const [show, setShow] = useState(false),
    id = useId()
  return (
    <label className={'field ' + className} htmlFor={id}>
      {label || placeholder}
      <span className="password-wrap">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
        />
        <button
          className="icon-button"
          type="button"
          onClick={() => setShow(!show)}
          aria-label={
            show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
          }
          aria-pressed={show}
        >
          <Icon name="eye" size={18} />
        </button>
      </span>
    </label>
  )
}
