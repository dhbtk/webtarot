import styled from 'styled-components'

export const Form = styled.form`
  display: grid;
  gap: 0.5rem;
  font-family: var(--font-sans-alt);
`
export const Label = styled.div`
  display: grid;
  gap: 0.12rem;

  span {
    font-size: var(--fs-xs);
    color: rgb(var(--white-rgb) / 0.65);
  }
`
export const Textarea = styled.textarea`
  font-family: var(--font-sans-alt);
  font-size: var(--fs-sm);
  background: rgb(var(--black-rgb) / 0.2);
  border: 1px solid rgb(var(--accent-rgb) / 0.5);
  border-radius: 6px;
  resize: none;
  padding: 0.5rem;
  box-shadow: 0 0 2px 2px transparent;
  transition: box-shadow 0.25s ease-in-out;

  &:hover {
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb) / 0.5);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb));
  }
`
export const RoundButton = styled.button`
  font-family: var(--font-sans);
  padding: 0.12rem;
  border-radius: 50%;
  text-align: center;
  width: 1.5rem;
  height: 1.5rem;
  outline: none;
  border: none;
  box-shadow: 0 0 2px 2px transparent;
  transition: all 0.25s ease-in-out;

  background: rgb(var(--white-rgb) / 0.1);

  &:hover {
    background: rgb(var(--white-rgb) / 0.15);
    box-shadow: 0 0 2px 2px rgb(var(--white-rgb) / 0.3);
  }

  &:active {
    background: rgb(var(--white-rgb) / 0.2);
    box-shadow: 0 0 2px 2px rgb(var(--white-rgb) / 0.5);
  }
`
export const SubmitButton = styled.button`
  margin-top: 0.5rem;
  color: rgb(var(--white-rgb) / 0.75);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  font-weight: 600;
  background: linear-gradient(135deg, rgba(174, 146, 248, 0.5), rgba(246, 113, 225, 0.5) 50%, rgba(174, 146, 248, 0.5));
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(var(--white-rgb) / 0.1);
  transition: all 0.15s ease-in-out;
  text-shadow: 1px 2px 2px rgb(var(--black-rgb) / 0.8);

  &:hover {
    background-position: 100px;
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb) / 0.5);
  }

  &:active {
    background-position: 150px;
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb) / 1);
  }
`
export const Heading = styled.h2`
  margin: 0;
  text-align: center;
  font-weight: 400;
  font-size: var(--fs-xl);
  opacity: 0;
  animation: fade-in var(--anim-duration) var(--anim-function) forwards;
  animation-delay: calc(var(--anim-duration) / 2);
  text-shadow: 1px 2px 2px rgb(var(--black-rgb) / 0.8);

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`
export const FormWrapper = styled.div`
  background-color: rgb(var(--soft-pink-rgb) / 0.4);
  padding: 1.5rem;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: min(100%, 500px);
  width: 100%;
  margin: 0 auto;
  box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
  animation: slide-from-bottom var(--anim-duration) var(--anim-function) forwards;

  &.wide {
    max-width: min(100%, 700px);
  }

  h2 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 500;
  }
`
