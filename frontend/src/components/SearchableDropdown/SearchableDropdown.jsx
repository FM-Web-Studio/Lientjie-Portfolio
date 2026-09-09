import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'
import './SearchableDropdown.css'

// Structural layout only - state styles (hover/focus/selected) live in the CSS
// file via classNamePrefix selectors, because rgba(var(--x), a) does not resolve
// inside react-select's inline JS styles.
const customStyles = {
  control: (base, { isDisabled }) => ({
    ...base,
    minHeight: '42px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    background: 'var(--background-1)',
    boxShadow: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    fontSize: 'var(--font-size-base)',
    transition: 'border-color 200ms ease, box-shadow 200ms ease, background-color 200ms ease',
  }),
  valueContainer: (base) => ({ ...base, padding: '0 var(--spacing-sm) 0 var(--spacing-md)' }),
  input: (base) => ({ ...base, margin: 0, padding: 0, color: 'var(--primary-text-color)' }),
  singleValue: (base) => ({ ...base, color: 'var(--primary-text-color)' }),
  placeholder: (base) => ({ ...base, color: 'var(--tertiary-text-color)' }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: 'var(--border-color)', opacity: 0.6 }),
  dropdownIndicator: (base, { selectProps }) => ({
    ...base,
    color: 'var(--secondary-text-color)',
    padding: '0 var(--spacing-sm)',
    transition: 'color 150ms ease, transform 200ms ease',
    transform: selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  }),
  clearIndicator: (base) => ({ ...base, color: 'var(--secondary-text-color)', padding: '0 var(--spacing-xs)' }),
  menu: (base) => ({
    ...base,
    background: 'var(--background-1)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    marginTop: 'var(--spacing-xs)',
    overflow: 'hidden',
    zIndex: 'var(--z-dropdown)',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menuList: (base) => ({ ...base, background: 'transparent', padding: 'var(--spacing-xs)', maxHeight: '260px' }),
  option: (base) => ({
    ...base,
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--primary-text-color)',
    background: 'transparent',
    transition: 'background-color 120ms ease',
  }),
  noOptionsMessage: (base) => ({ ...base, color: 'var(--secondary-text-color)', fontSize: 'var(--font-size-sm)' }),
}

export default function SearchableDropdown({
  options, value, onChange, placeholder,
  isClearable = false, isDisabled = false,
  // `creatable` swaps in react-select's Creatable variant, which offers
  // whatever the user has typed as a new option. Same styling either way.
  creatable = false,
  ...props
}) {
  const Component = creatable ? CreatableSelect : Select

  return (
    <Component
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      isClearable={isClearable}
      isDisabled={isDisabled}
      styles={customStyles}
      classNamePrefix="searchable-select"
      menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
      {...props}
    />
  )
}
