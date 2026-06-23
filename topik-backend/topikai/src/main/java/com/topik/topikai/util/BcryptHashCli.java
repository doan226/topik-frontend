package com.topik.topikai.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** One-off: mvn -q exec:java -Dexec.mainClass=com.topik.topikai.util.BcryptHashCli -Dexec.args=1 */
public final class BcryptHashCli {

    public static void main(String[] args) {
        String raw = args.length > 0 ? args[0] : "1";
        System.out.println(new BCryptPasswordEncoder(10).encode(raw));
    }
}
