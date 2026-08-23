cask "brewmate" do
  version '1.0.39'

  url "https://github.com/romankurnovskii/BrewMate/releases/download/#{version}/BrewMate-#{version}-universal.dmg"
  name "BrewMate"
  desc "Homebrew GUI apps manager"
  homepage "https://github.com/romankurnovskii/BrewMate"
  sha256 'b0a04dfc9dc8dbb2652db772aa59ead3cb4afdedf12b6b5c6005de5798c62f03'

  auto_updates true

  app "BrewMate.app"

  zap trash: [
    "~/Library/Application Support/brewmate",
  ]
end
