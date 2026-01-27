import Image from "next/image";
import styles from "./page.module.css";
import Screen from "@/components/screen/Screen";
export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        
           <div className={styles.screen}>
         
              <Screen/>
          </div>
      </main>
    </div>
  );
}
