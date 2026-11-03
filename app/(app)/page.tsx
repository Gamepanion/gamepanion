import { Home } from "./Home";
import { pagePlayer } from "./viewer";

export const dynamic = "force-dynamic";

// Your games.
export default async function HomePage() {
  return (
    <div className="px-4 pt-6 pb-20 lg:px-14">
      <Home player={await pagePlayer()} />
    </div>
  );
}
