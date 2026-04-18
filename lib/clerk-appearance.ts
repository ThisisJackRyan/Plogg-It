import type { Appearance } from '@clerk/types';

const brand = {
  primary: 'oklch(0.62 0.2 145)',
  text: '#111',
  textSecondary: 'rgba(17, 17, 17, 0.65)',
  background: '#ffffff',
  inputBg: 'rgba(255, 255, 255, 0.9)',
  danger: '#dc2626',
};

const sharedElements: NonNullable<Appearance['elements']> = {
  rootBox: 'w-full max-w-sm mx-auto',
  cardBox:
    'w-full rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_32px_-12px_rgba(0,0,0,0.12)] overflow-hidden',
  card: 'bg-transparent shadow-none border-0 px-6 pt-7 pb-6',
  header: 'text-center mb-5',
  headerTitle: 'text-xl font-semibold tracking-tight',
  headerSubtitle: 'text-sm opacity-70 mt-1',
  main: 'gap-4',
  socialButtons: 'gap-2',
  socialButtonsBlockButton:
    'rounded-lg border border-black/10 bg-white hover:bg-black/[0.03] transition text-sm font-medium normal-case shadow-none h-10',
  socialButtonsBlockButtonText: 'font-medium text-sm',
  socialButtonsProviderIcon: 'w-4 h-4',
  dividerRow: 'my-1',
  dividerLine: 'bg-black/10',
  dividerText: 'text-[11px] uppercase tracking-[0.14em] opacity-50',
  formFieldRow: 'gap-1.5',
  formFieldLabel: 'text-xs font-medium opacity-80',
  formFieldLabelRow: 'gap-2',
  formFieldHintText: 'text-[11px] opacity-60',
  formFieldInput:
    'rounded-lg border border-black/10 bg-white px-3 py-2 text-sm h-10 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20',
  formFieldInputShowPasswordButton: 'opacity-60 hover:opacity-100',
  formFieldAction: 'text-xs font-medium text-brand-700 hover:text-brand-600',
  formFieldErrorText: 'text-xs text-red-600 mt-1',
  formFieldSuccessText: 'text-xs text-brand-700 mt-1',
  formButtonPrimary:
    'rounded-lg bg-brand-600 hover:bg-brand-700 active:bg-brand-700 text-white text-sm font-medium normal-case shadow-none transition h-10',
  formButtonReset:
    'rounded-lg text-sm font-medium text-brand-700 hover:bg-brand-500/10 normal-case',
  buttonArrowIcon: 'hidden',
  footer:
    'bg-black/[0.02] border-t border-black/5 px-6 py-4 m-0 rounded-none',
  footerAction: 'bg-transparent justify-center',
  footerActionText: 'text-sm opacity-70',
  footerActionLink:
    'text-sm font-medium text-brand-700 hover:text-brand-600 ml-1',
  footerPages: 'hidden',
  footerPagesLink: 'hidden',
  logoBox: 'hidden',
  identityPreview:
    'rounded-lg border border-black/10 bg-white/70 px-3 py-2',
  identityPreviewText: 'text-sm',
  identityPreviewEditButton: 'text-brand-700 hover:text-brand-600',
  formResendCodeLink: 'text-sm text-brand-700 hover:text-brand-600',
  otpCodeFieldInput: 'border border-black/10 rounded-lg text-sm',
  alert: 'rounded-lg text-sm',
  alertText: 'text-sm',
  badge: 'rounded-full text-[11px]',
  button: 'rounded-lg',
};

export const clerkAppearance: Appearance = {
  layout: {
    socialButtonsPlacement: 'top',
    socialButtonsVariant: 'blockButton',
    logoPlacement: 'none',
    showOptionalFields: true,
  },
  variables: {
    colorPrimary: brand.primary,
    colorText: brand.text,
    colorTextSecondary: brand.textSecondary,
    colorBackground: brand.background,
    colorInputBackground: brand.inputBg,
    colorInputText: brand.text,
    colorDanger: brand.danger,
    colorNeutral: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '0.5rem',
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    fontSize: '0.875rem',
    spacingUnit: '1rem',
  },
  elements: {
    ...sharedElements,
    // UserButton
    userButtonAvatarBox: 'h-8 w-8 ring-1 ring-black/10',
    userButtonPopoverCard:
      'rounded-xl border border-black/5 shadow-lg overflow-hidden',
    userButtonPopoverActionButton:
      'text-sm hover:bg-black/[0.04] transition',
    userButtonPopoverFooter: 'hidden',
    userPreviewMainIdentifier: 'font-medium',
    menuButton: 'rounded-lg',
    menuList: 'rounded-xl border border-black/5 shadow-lg',
    menuItem: 'text-sm hover:bg-black/[0.04]',
    // UserProfile
    navbar:
      'bg-transparent border-r border-black/5 dark:border-white/10',
    navbarButton:
      'rounded-lg text-sm font-medium hover:bg-black/[0.04] transition',
    navbarButtonIcon: 'opacity-70',
    pageScrollBox: 'bg-transparent',
    page: 'bg-transparent',
    profileSection: 'border-b border-black/5 dark:border-white/10',
    profileSectionTitle: 'border-0',
    profileSectionTitleText: 'text-base font-semibold tracking-tight',
    profileSectionContent: 'text-sm',
    profileSectionPrimaryButton:
      'rounded-lg text-sm font-medium text-brand-700 hover:bg-brand-500/10 normal-case',
    accordionTriggerButton:
      'rounded-lg text-sm hover:bg-black/[0.04] transition',
    accordionContent: 'text-sm',
    breadcrumbs: 'text-xs opacity-70',
    avatarBox: 'ring-1 ring-black/10',
    avatarImageActionsUpload:
      'rounded-lg text-sm font-medium text-brand-700 hover:bg-brand-500/10',
    avatarImageActionsRemove:
      'rounded-lg text-sm font-medium text-red-600 hover:bg-red-50',
    tableHead: 'text-xs uppercase tracking-wider opacity-60',
    tagPillContainer: 'rounded-full',
    selectButton: 'rounded-lg border border-black/10',
    selectOptionsContainer: 'rounded-xl border border-black/5 shadow-lg',
  },
};
