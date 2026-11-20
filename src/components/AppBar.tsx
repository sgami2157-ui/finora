import { Logo } from "./Icon";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";

/** Bilah atas tunggal untuk semua ukuran layar: logo (hanya di ponsel) + pencarian + tema. Dirender sekali di layout. */
export default function AppBar() {
  return (
    <header className="appbar">
      <a href="/dashboard" className="appbar-logo" aria-label="FINORA — Beranda"><Logo size={30} /></a>
      <SearchBar />
      <ThemeToggle />
    </header>
  );
}
