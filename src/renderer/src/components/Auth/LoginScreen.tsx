import React from 'react'
import { FaGithub } from 'react-icons/fa'
import { useAppContext } from '../../context/AppContext'

const LoginScreen: React.FC = () => {
  const { auth, login } = useAppContext()

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>ハックツール</h1>
          <p>GitHubアカウントでログインして始めましょう</p>
        </div>

        <div className="login-content">
          {auth.error && (
            <div className="login-error">
              <p>ログインエラー: {auth.error}</p>
            </div>
          )}

          <button className="github-login-btn" onClick={login} disabled={auth.isLoading}>
            <FaGithub className="github-icon" />
            {auth.isLoading ? 'ログイン中...' : 'GitHubでログイン'}
          </button>

          <div className="login-info">
            <p>
              GitHubアカウントを使用してログインします。
              <br />
              アプリケーションが基本的なプロフィール情報にアクセスします。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
