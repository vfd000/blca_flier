import { useAuth } from "../hooks/useAuth";

export function SignInButton() {
  const { session, profile, signInWithGoogle, signOut } = useAuth();

  if (!session) {
    return (
      <button className="btn btn-primary" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="signed-in">
      <span className="signed-in-email">
        {profile?.display_name ?? session.user.email}
        {profile && <span className="role-badge">{profile.role}</span>}
      </span>
      <button className="btn" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
